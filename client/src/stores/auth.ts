import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("blog_token") ?? "",
    username: "",
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
  },
  actions: {
    login(username: string, token: string) {
      this.username = username;
      this.token = token;
      localStorage.setItem("blog_token", token);
    },
    logout() {
      this.username = "";
      this.token = "";
      localStorage.removeItem("blog_token");
    },
  },
});
