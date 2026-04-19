import { createApp } from "vue";
import "highlight.js/styles/github-dark.css";
import "./style.css";
import App from "./App.vue";
import { createPinia } from "pinia";
import router from "./router";

createApp(App).use(createPinia()).use(router).mount("#app");
