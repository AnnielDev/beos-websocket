<template>
  <div>
    <h1>Formulario de Usuario</h1>

    <form @submit.prevent="handleSubmit">
      <label>
        Nombre:
        <input v-model="form.name" required />
      </label>

      <br />

      <label>
        Apellido:
        <input v-model="form.lastName" required />
      </label>

      <br />

      <label>
        Edad:
        <input v-model.number="form.age" type="number" required />
      </label>

      <br />

      <label>
        Sexo:
        <select v-model="form.sex" required>
          <option value="">Seleccionar</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>
      </label>

      <br />

      <button type="submit">Enviar</button>
    </form>

    <h2>Respuesta del WebSocket</h2>

    <div v-if="user.name">
      <p>
        <strong>Nombre:</strong>
        {{ user.name }}
      </p>

      <p>
        <strong>Apellido:</strong>
        {{ user.lastName }}
      </p>

      <p>
        <strong>Edad:</strong>
        {{ user.age }}
      </p>

      <p>
        <strong>Sexo:</strong>
        {{ user.sex }}
      </p>
    </div>

    <p v-else>No hay datos recibidos aún.</p>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import {
  BeosSocketConnection,
  BeosWebSocket,
} from "./utils/BeosSocketConnection";

interface User {
  name: string;
  lastName: string;
  age: number | null;
  sex: string;
}

const form = ref<User>({
  name: "",
  lastName: "",
  age: null,
  sex: "",
});

const user = ref<User>({
  name: "",
  lastName: "",
  age: null,
  sex: "",
});

const wsc = ref<BeosWebSocket>(BeosSocketConnection());

// 👇 handler central de mensajes
const handleMessage = (event: MessageEvent) => {
  try {
    const payload = JSON.parse(event.data);
    console.log("Mensaje recibido:", payload);
    switch (payload.event) {
      case "create-user":
        user.value = payload.data;
        break;

      default:
        console.warn("Evento no manejado:", payload.event);
    }
  } catch (error) {
    console.error("Mensaje inválido:", event.data);
  }
};

const handleSubmit = () => {
  if (!wsc.value) {
    alert("❌ No hay conexión WebSocket activa");
    return;
  }

  wsc.value.send({
    event: "create-user",
    data: form.value,
  });
};

onMounted(() => {
  wsc.value.on("message", handleMessage);
});

onUnmounted(() => {
  if (wsc.value) {
    wsc.value.off("message", handleMessage);
  }
});
</script>
