export const featureRoutes = [
  {
    to: "/",
    labelKey: "title",
    load: () => import("./features/home/index"),
  },
] as const;
