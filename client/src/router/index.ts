import { defineRouter } from "#q-app";
import { createRouter, createWebHashHistory } from "vue-router";
export default defineRouter(() =>
  createRouter({
    history: createWebHashHistory(),
    routes: [
      {
        path: "/",
        component: () => import("../pages/LauncherShell.vue"),
        children: [
          {path:"games",component:()=>import("../pages/GamesPage.vue")},
          {
            path: "signal",
            component: () => import("../pages/ArcanaPage.vue")
          },
          { path: "", component: () => import("../pages/HomePage.vue") },
          {
            path: "instances",
            component: () => import("../pages/InstancesPage.vue")
          },
          {
            path: "downloads",
            component: () => import("../pages/DownloadsPage.vue")
          },
          {
            path: "appearance",
            component: () => import("../pages/AppearancePage.vue")
          },
          {
            path: "blueprints/:id?",
            component: () => import("../pages/BlueprintsPage.vue")
          },
          {
            path: "forum/:id?",
            component: () => import("../pages/ForumPage.vue")
          },
          { path: "chat", component: () => import("../pages/ChatPage.vue") },
          {
            path: "notices/:group?",
            component: () => import("../pages/NoticesPage.vue")
          },
          {
            path: "accounts",
            component: () => import("../pages/AccountsPage.vue")
          },
          {
            path: "settings",
            component: () => import("../pages/SettingsPage.vue")
          },
          { path: "logs", redirect: "/" },
          { path: ":pathMatch(.*)*", redirect: "/" }
        ]
      }
    ],
    scrollBehavior: () => ({ top: 0 })
  })
);
