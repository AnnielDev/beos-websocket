# WebSocket con Vue 3 y TypeScript

Este proyecto sirve como laboratorio reutilizable para conectar una aplicación Vue con WebSockets. Incluye una envoltura tipada sobre la API nativa `WebSocket`, manejo de eventos de conexión, suscripciones por evento de negocio y un ejemplo completo de envio y recepcion de datos.

## Resultado rápido

La aplicación muestra un formulario de usuario. Al enviarlo:

1. Vue serializa `form` y envia un objeto JSON.
2. `BeosWebSocket.send()` valida que la conexion este abierta.
3. El servidor devuelve el mismo mensaje o una respuesta compatible.
4. `App.vue` procesa el campo `event` y actualiza la vista.

El contrato usado en el ejemplo es:

```json
{
  "event": "create-user",
  "data": {
    "name": "Ana",
    "lastName": "Perez",
    "age": 25,
    "sex": "F"
  }
}
```

## Ejecutar el proyecto

Requisitos: Node.js y pnpm.

```bash
pnpm install
pnpm dev
```

Compilar y verificar tipos:

```bash
pnpm build
```

Vista previa de la compilacion:

```bash
pnpm preview
```

## Arquitectura

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/main.ts` | Crea la aplicacion Vue y monta `App.vue`. |
| `src/App.vue` | Contiene el formulario, el estado reactivo y los ejemplos de manejo de mensajes. |
| `src/utils/BeosSocketConnection.ts` | Construye la instancia, conecta y registra los eventos generales de conexion. |
| `src/utils/BeosWebSocket.ts` | Envuelve la API nativa `WebSocket` y expone listeners y suscripciones de negocio. |

## Flujo de conexion

`BeosSocketConnection()` crea una instancia de `BeosWebSocket`, registra logs para `open`, `close` y `error`, y llama a `connect()`:

```ts
const wsc = BeosSocketConnection();
```

Puede pasarse uno o varios subprotocolos:

```ts
const wsc = BeosSocketConnection({
  protocols: ["mi-protocolo"],
});
```

### URL actual

La URL esta definida dentro de `BeosWebSocket`:

```ts
const url = "wss://ws.ifelse.io";
```

Para reutilizar el codigo con otro backend, reemplazar esta constante por la URL del servidor correspondiente. Es posible mejorarla despues como parametro obligatorio del constructor o mediante variables de entorno.

## Eventos de conexion

`BeosWebSocket` reconoce estos eventos nativos adaptados:

| Evento | Cuando ocurre | Datos disponibles |
|--------|---------------|-------------------|
| `open` | El handshake termino correctamente | Sin argumentos |
| `message` | El servidor envio un mensaje | `MessageEvent` |
| `error` | Ocurre un error del socket | `Event` |
| `close` | La conexion se cerro | `CloseEvent` |

Registrar y quitar un listener:

```ts
const handleOpen = () => console.log("Conectado");

wsc.on("open", handleOpen);
wsc.off("open", handleOpen);
```

Los listeners deben quitarse al desmontar componentes para evitar llamadas repetidas o perdida de referencias.

## Enviar mensajes

`send()` acepta texto o cualquier objeto serializable:

```ts
wsc.send({
  event: "create-user",
  data: form.value,
});
```

El metodo realiza dos protecciones:

- Si no existe una instancia de `WebSocket`, informa que no fue inicializada.
- Si `readyState` no es `WebSocket.OPEN`, informa el estado actual y no envia.

Texto plano tambien es aceptado:

```ts
wsc.send("Hola servidor");
```

## Recibir mensajes por evento

El objeto devuelve el `MessageEvent` a los listeners generales y, ademas, intenta convertir el texto JSON en:

```ts
interface SocketMessage<T = unknown> {
  event: string;
  data: T;
}
```

### Forma 1: listener general

Usar `on("message", ...)` cuando se necesita inspeccionar todo el mensaje crudo:

```ts
const handleMessage = (event: MessageEvent) => {
  try {
    const payload = JSON.parse(event.data);

    switch (payload.event) {
      case "create-user":
        user.value = payload.data;
        break;

      default:
        console.warn("Evento no manejado:", payload.event);
    }
  } catch {
    console.error("Mensaje inválido:", event.data);
  }
};

wsc.on("message", handleMessage);
```

### Forma 2: suscripcion por negocio

Usar `subscribe()` cuando solo interesa el contenido de un evento:

```ts
const onUserCreated = (data: User) => {
  user.value = data;
};

wsc.subscribe("create-user", onUserCreated);
```

Al quitarse el componente:

```ts
wsc.unsubscribe("create-user", onUserCreated);
```

Esta segunda forma esta documentada en `App.vue` dentro del bloque de ejemplo comentado. La implementacion activa en el proyecto usa el listener general con `switch`.

## Integracion con Vue

Una instancia debe compartirse durante el ciclo de vida que necesita la conexion:

```ts
const wsc = ref<BeosWebSocket>(BeosSocketConnection());
```

Se recomienda registrar listeners en `onMounted()` y retirarlos en `onUnmounted()`:

```ts
onMounted(() => {
  wsc.value.on("message", handleMessage);
});

onUnmounted(() => {
  wsc.value.off("message", handleMessage);
});
```

Para formularios Vue, `v-model` mantiene sincronizados los datos de entrada:

- `v-model="form.name"` enlaza texto.
- `v-model.number="form.age"` convierte la edad a numero.
- `v-model="form.sex"` enlaza la opcion seleccionada.
- `@submit.prevent="handleSubmit"` evita la recarga y ejecuta el envio.

## Estado y limpieza

Getters disponibles:

| Getter | Resultado |
|--------|-----------|
| `readyState` | Estado numerico nativo o `null`. |
| `isConnected` | `true` solo con `WebSocket.OPEN`. |
| `isConnecting` | `true` solo con `WebSocket.CONNECTING`. |
| `isClosed` | `true` si no existe el socket o esta cerrado. |
| `urlInfo` | URL configurada. |
| `hasInstance` | Indica si existe una instancia activa. |

Metodos de limpieza:

```ts
wsc.clearSubscriptions();
wsc.clearListeners();
wsc.close();
wsc.destroy();
```

- `clearSubscriptions()` elimina suscripciones de eventos de negocio.
- `clearListeners()` elimina listeners nativos.
- `close()` cierra la conexion.
- `destroy()` combina ambas limpiezas y cierra el socket.

## Implementacion existente

El proyecto incluye estas decisiones:

- Vue 3 con Composition API y `script setup`.
- TypeScript con comprobacion estricta aportada por Vue TSC.
- Vite como servidor de desarrollo y empaquetador.
- API nativa `WebSocket` sin dependencias adicionales.
- Wrapper propio con dos tipos de observadores: eventos de socket y eventos de negocio.
- Validacion de envio segun el estado de apertura.
- Parseo seguro de mensajes JSON para suscripciones.
- Manejo visible de mensajes invalidos y eventos no registrados.
- Ejemplo comentado adicional para suscripcion y desuscripcion.

## Convenciones de mensajes

Cada respuesta de negocio debe incluir al menos:

```ts
{
  event: "nombre-del-evento",
  data: // payload esperado
}
```

Conviene mantener una convención estable en el backend y el frontend:

- Usar nombres descriptivos y consistentes, por ejemplo `create-user`, `update-user` y `delete-user`.
- Mantener el tipo de `data` coherente para cada `event`.
- Registrar un caso `default` para evitar mensajes silenciosamente ignorados.
- Separar la validacion del payload del renderizado o de la logica de negocio.
- No asumir que todo `message` contiene JSON valido.

## Limitaciones conocidas

El wrapper actual es una base de aprendizaje y todavia no incluye:

- Reconexion automatica con reintentos.
- Cola de mensajes para el periodo `CONNECTING`.
- Heartbeat/ping-pong.
- Autenticacion o configuracion de headers.
- Cancelacion de suscripciones duplicadas.
- Recuperacion tipada centralizada por contrato de eventos.
- URL configurable por constructor o variables de entorno.

Estas mejoras deben implementarse segun las necesidades reales del backend.

## Checklist para reutilizarlo

- [ ] Cambiar `url` por el endpoint WebSocket real.
- [ ] Definir los contratos JSON y sus tipos TypeScript.
- [ ] Registrar listeners o suscripciones en `onMounted()`.
- [ ] Retirar listeners o suscripciones en `onUnmounted()`.
- [ ] Validar `isConnected` antes de enviar donde el momento importe.
- [ ] Manejar `open`, `close`, `error` y mensajes invalidos.
- [ ] Agregar reconexion si la red o el servidor pueden desconectarse.
- [ ] Proteger datos sensibles segun el canal y el protocolo del proyecto.

## Historial resumido

El repositorio ya registra estos cambios:

1. Creacion inicial con Vue, Vite, TypeScript y el wrapper WebSocket.
2. Eliminacion de una dependencia o paquete residual innecesario.
3. Cambio de alertas a logs en la construccion de la conexion.
4. Adicion de un ejemplo completo de suscripcion/desuscripcion en `App.vue`.

## Puntos a revisar antes de llevarlo a un proyecto real

Para pasar de esta demostracion a una integracion de trabajo, adaptar primero los contratos del servidor y la estrategia de reconexion. Despues agregar pruebas para envio durante estados abiertos/cerrados, mensajes JSON invalidos, eventos desconocidos y limpieza de listeners.
