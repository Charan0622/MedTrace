"use client";

import { useState } from "react";
import { DrugInfoModal } from "@/components/patient/DrugInfoModal";

interface DrugLinkProps {
  name: string;
  className?: string;
}

export function DrugLink({ name, className }: DrugLinkProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
        className={`font-mono text-emerald-400 hover:text-emerald-300 hover:underline transition-colors cursor-pointer text-left ${className ?? ""}`}
        title={`View drug info: ${name}`}
      >
        {name}
      </button>
      {showModal && <DrugInfoModal drugName={name} onClose={() => setShowModal(false)} />}
    </>
  );
}
