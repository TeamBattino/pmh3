declare module "@measured/puck/puck.css";

declare module "*.svg" {
  const content: { src: string; height: number; width: number };
  export default content;
}
