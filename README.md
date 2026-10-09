# Sistema de gestión para estudio contable

Aplicación web para que un estudio contable argentino siga las obligaciones
fiscales de toda su cartera: vencimientos, declaraciones juradas, planes de
pago, recategorización de monotributo y un portal donde cada cliente ve su
propia situación.

**Demo navegable:** _(pendiente de publicar)_
**Acceso de prueba:** usuario `20111111112`, contraseña `DemoEstudio2026`

> Los datos del demo son íntegramente inventados. Ningún nombre, CUIT o
> importe corresponde a un contribuyente real.

---

## El problema

Un estudio con una cartera mezclada —monotributistas, responsables inscriptos
y sociedades— llevaba sus vencimientos en una planilla de cálculo. Funcionaba,
pero tenía tres límites que aparecían todos los meses.

**Una fila no alcanza para una persona.** Alguien que es monotributista y
además titular de una SAS tiene dos CUIT, con impuestos, planes de pago y
vencimientos propios de cada uno.

**El estado de cada obligación vivía en tres lugares.** Saber si una
declaración estaba presentada, si la boleta se había generado, si se le había
mandado al cliente y si el cliente la había pagado exigía cruzar la planilla
con el correo y con WhatsApp.

**La recategorización se hacía a mano.** Comparar doce meses de facturación
contra los topes de cada categoría, para cada cliente, dos veces al año.

---

## Qué hace

**Panel del estudio.** Dashboard con honorarios cobrados y pendientes,
vencimientos de la semana y obligaciones vencidas. Gestión de clientes con
filtros por tipo y estado, y búsqueda que también encuentra sociedades por el
nombre de su titular. Calendario fiscal por terminación de CUIT. Tablero de
impuestos del mes donde cada obligación tiene cuatro casillas: presentada,
boleta generada, enviada, pagada. Planes de facilidades de ARCA y de Rentas
con sus cuotas. Libro IVA Digital con importación desde los CSV de Mis
Comprobantes. Tareas internas y facturación de honorarios.

**Portal del cliente.** Semáforo fiscal, descarga de VEPs y acuses, acceso a
su documentación y carga de comprobantes de gastos.

**Automatizaciones.** Generación de las obligaciones del mes para toda la
cartera en una operación. Envío de boletas por correo con el PDF adjunto o por
WhatsApp con el link. Detección de quiénes necesitan recategorizarse, con la
categoría sugerida y el cambio de cuota.

---

## Decisiones de diseño

**Un legajo por CUIT, no por persona.** La alternativa era un solo legajo con
casilleros para «es RI», «es MT», «tiene SAS». Se descartó porque mezclaba en
una misma fila impuestos y planes de pago que pertenecen a contribuyentes
distintos ante ARCA. Cada CUIT es un legajo propio y las personas se vinculan
a sus sociedades con un rol: titular, representante, socio o apoderado.

**Los clientes que se van no se borran, se marcan inactivos.** Salen de los
tableros y no se les generan obligaciones nuevas, pero conservan comprobantes,
planes y documentos. Un estudio tiene que poder responder por ejercicios
cerrados años después.

**Los topes del monotributo viven en el código, no en la base.** La base
aporta los ingresos facturados; el código, la escala vigente. Son datos de
naturaleza distinta: uno cambia todos los días, el otro cuando ARCA publica
una resolución.

**Las claves fiscales se cifran y cada lectura queda registrada.** Se cifran
con `pgcrypto`, la clave maestra vive en un almacén de secretos separado, el
`SELECT` directo sobre esas columnas está revocado incluso para el personal, y
cada vez que alguien revela una clave queda asentado quién y cuándo.

**Para WhatsApp, el link y no la API.** La API oficial exige cuenta
verificada, plantillas aprobadas y pago por conversación. Para el volumen de
un estudio chico, abrir el chat con el mensaje ya escrito resuelve lo mismo.

---

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · PostgreSQL · Supabase
(Auth, Storage, Row Level Security)

El control de acceso está implementado con Row Level Security a nivel de base
de datos: un cliente que entra al portal solo puede leer las filas de su
propio legajo, y eso lo garantiza PostgreSQL, no el código de la aplicación.

Tres roles: administrador, contador del estudio y cliente. El login acepta
CUIT o DNI en lugar de correo, porque es el número con el que el estudio y el
cliente ya se identifican.

Once migraciones SQL versionadas documentan la evolución del esquema.

---

## Dos problemas que vale la pena contar

**Recursión en las políticas de seguridad.** Las primeras políticas
consultaban la tabla de perfiles para averiguar el rol del usuario. Esa tabla
tiene su propia política, que vuelve a consultarla: PostgreSQL entra en
recursión infinita y devuelve el error 42P17. Se resolvió moviendo la consulta
del rol a funciones `SECURITY DEFINER`, que se ejecutan con los permisos del
dueño y no vuelven a disparar las políticas.

**RLS y GRANT son dos capas distintas.** Más adelante aparecieron tablas con
las políticas bien escritas que igual devolvían «permission denied». Sin el
`GRANT` correspondiente al rol `authenticated`, PostgreSQL corta antes de
llegar a evaluar las políticas.

---

## Correrlo localmente

```bash
npm install
cp .env.example .env.local   # completar con los datos del proyecto Supabase
npm run dev
```

El esquema está en `supabase/migrations`, para ejecutar en orden. Después hay
que crear el secreto de la clave maestra:

```sql
SELECT vault.create_secret('<una frase larga>', 'clave_maestra_contable');
```

Y cargar los datos de prueba y el usuario de acceso:

```bash
npm run seed:demo
node scripts/crear-admin.mjs 20111111112 "Contadora Demo" DemoEstudio2026
```

El seed exige `NEXT_PUBLIC_MODO_DEMO=true` en el entorno: es un freno para que
no haya forma de cargar datos ficticios en una base con clientes reales.

---

## Estructura

```
src/
  app/
    page.tsx          landing pública con simulador de impuestos
    login/            acceso por CUIT o DNI
    admin/            panel del estudio
      clientes/ vencimientos/ obligaciones/ ddjj/ planes/
      envios/ recategorizacion/ comprobantes/ tareas/ honorarios/
    portal/           portal del cliente
  components/ui/      primitivas de interfaz
  lib/
    supabase/         clientes de navegador, servidor y middleware
    parametros-fiscales.ts   escala del monotributo
    demo.ts           bandera del modo demo
supabase/migrations/  esquema versionado
scripts/              utilidades de línea de comandos
```

---

## Sobre este repositorio

El sistema está en uso real en un estudio contable desde septiembre de 2026.
Este repositorio contiene el código con datos de demostración: los scripts de
carga de la cartera real y cualquier referencia a clientes quedaron fuera.

El proyecto fue diseñado e implementado con asistencia de inteligencia
artificial. El relevamiento del circuito contable, el modelado de datos y las
decisiones de negocio documentadas arriba son propios.
