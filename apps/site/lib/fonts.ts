import localFont from "next/font/local";
import { Londrina_Solid } from "next/font/google";

export const londrina = Londrina_Solid({
  weight: "400",
  subsets: ["latin"],
  variable: "--londrina",
  display: "swap",
});

export const poppins = localFont({
  src: [
    {
      path: "./assets/Poppins-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./assets/Poppins-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--poppins",
  display: "swap",
});
