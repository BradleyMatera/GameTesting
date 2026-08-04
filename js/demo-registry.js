import { createDigitalCommandCenter } from "./demos/digital-command-center.js";

export const demos = [
  {
    id: "digital-command-center",
    number: "01",
    title: "Digital Command Center",
    shortTitle: "Command Center",
    status: "LIVE",
    enabled: true,
    description:
      "A live 3D map of the systems I build: cloud infrastructure, AI agents, web engineering, and interactive technology.",
    create: createDigitalCommandCenter,
  },
  {
    id: "terrain-systems",
    number: "02",
    title: "Procedural Terrain",
    shortTitle: "Terrain Systems",
    status: "NEXT",
    enabled: false,
  },
  {
    id: "agent-simulation",
    number: "03",
    title: "Agent Simulation",
    shortTitle: "Agent Simulation",
    status: "PLANNED",
    enabled: false,
  },
];

export function getDemo(id) {
  return demos.find((demo) => demo.id === id && demo.enabled) ?? demos.find((demo) => demo.enabled);
}
