"use client";
import { CollapseSvg } from "@pfadipuck/graphics/CollapseSvg";
import { cn } from "@/lib/cn";
import { ReactNode, useState } from "react";
import styles from "./PuckHeader.module.css";
import UndoRedoButtons from "./UndoRedoButtons";

type PuckHeaderProps = {
  headerTitle?: ReactNode;
  headerActions?: ReactNode;
};

function PuckHeader({ headerTitle, headerActions }: PuckHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        styles.header,
        "relative flex justify-between items-center px-4 py-2 gap-4 border-b"
      )}
    >
      <div>
        <h1 className="text-lg font-bold">{headerTitle}</h1>
      </div>

      <div className="flex items-center gap-3 sm:hidden">
        <UndoRedoButtons />
        <button
          className="w-6 h-6 cursor-pointer"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle Menu"
          title="Toggle Menu"
        >
          <CollapseSvg open={menuOpen} />
        </button>
      </div>
      <div
        className={cn(
          "hidden absolute top-full left-0 right-0 bg-background z-10 p-4 mt-[2px] border-b",
          menuOpen ? "block" : "sm:block",
          "sm:static sm:border-0 sm:mt-0 sm:p-0 sm:bg-transparent"
        )}
      >
        {headerActions}
      </div>
    </header>
  );
}

export default PuckHeader;
