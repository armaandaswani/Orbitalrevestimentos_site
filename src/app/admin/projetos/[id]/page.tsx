"use client";

import { use } from "react";
import ProjectEditor from "../ProjectEditor";

export default function EditarProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProjectEditor id={id} />;
}
