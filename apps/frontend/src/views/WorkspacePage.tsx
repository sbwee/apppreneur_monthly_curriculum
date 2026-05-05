"use client";

import { useMemo, useState } from "react";
import { Header } from "@/src/components/home/Header";
import { Sidebar } from "@/src/components/home/Sidebar";
import { NoteEditor } from "@/src/components/workspace/NoteEditor";
import { UtilityPanel } from "@/src/components/workspace/UtilityPanel";
import { curriculumPaths } from "@/src/data/mockWorkspace";

export function WorkspacePage() {
  const [selectedCurriculumId, setSelectedCurriculumId] = useState(curriculumPaths[0].id);

  const selectedCurriculum = useMemo(
    () => curriculumPaths.find((path) => path.id === selectedCurriculumId) ?? curriculumPaths[0],
    [selectedCurriculumId],
  );

  return (
    <main className="workspace-shell">
      <Sidebar
        activeHref="/workspace"
        curriculums={curriculumPaths}
        selectedCurriculumId={selectedCurriculum.id}
        onCurriculumSelect={setSelectedCurriculumId}
      />

      <section className="workspace-main">
        <Header searchPlaceholder="Search entries..." />
        <div className="workspace-grid">
          <NoteEditor note={selectedCurriculum.note} />
          <UtilityPanel />
        </div>
      </section>
    </main>
  );
}
