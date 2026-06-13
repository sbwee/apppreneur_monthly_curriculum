"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/src/components/home/Header";
import { Sidebar, type CurriculumLifecycleAction } from "@/src/components/home/Sidebar";
import { CreateCurriculumPanel } from "@/src/components/workspace/CreateCurriculumPanel";
import { GardenSpinner } from "@/src/components/workspace/GardenSpinner";
import { NoteEditor } from "@/src/components/workspace/NoteEditor";
import { UtilityPanel } from "@/src/components/workspace/UtilityPanel";
import { WorkspaceMainPanel } from "@/src/components/workspace/WorkspaceMainPanel";
import { getAccessToken } from "@/src/lib/auth";
import type { CurriculumPath } from "@/src/data/mockWorkspace";
import {
  bootstrapScheduleAfterSyllabus,
  findFirstIncompleteAssignment,
  isScheduleFullyComplete,
  type ScheduleAssignment,
} from "@/src/lib/scheduleApi";
import {
  fetchCurriculumDetail,
  fetchCurriculumList,
  generateCurriculumStructure,
  deleteCurriculum,
  updateCurriculumStatus,
  mapCurriculumListRow,
  type LoadedCurriculum,
  type PublishSettings,
} from "@/src/lib/workspaceApi";

export function WorkspacePage() {
  const [curriculumPaths, setCurriculumPaths] = useState<CurriculumPath[]>([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string | null>(null);
  const [loadedCurriculum, setLoadedCurriculum] = useState<LoadedCurriculum | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [allCaughtUp, setAllCaughtUp] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);
  const scheduleAssignmentsRef = useRef<ScheduleAssignment[]>([]);
  const selectedSectionIdRef = useRef<string | null>(null);
  const userPickedSectionRef = useRef(false);

  useEffect(() => {
    selectedSectionIdRef.current = selectedSectionId;
  }, [selectedSectionId]);

  const handleAssignmentsChange = useCallback((assignments: ScheduleAssignment[]) => {
    const previous = scheduleAssignmentsRef.current;
    scheduleAssignmentsRef.current = assignments;

    if (assignments.length === 0) {
      setAllCaughtUp(false);
      return;
    }

    if (isScheduleFullyComplete(assignments)) {
      setAllCaughtUp(true);
      setSelectedSectionId(null);
      userPickedSectionRef.current = false;
      return;
    }

    setAllCaughtUp(false);
    const nextIncomplete = findFirstIncompleteAssignment(assignments);
    const activeSectionId = selectedSectionIdRef.current;

    if (!userPickedSectionRef.current) {
      if (nextIncomplete) {
        setSelectedSectionId(nextIncomplete.curriculum_item_id);
      }
      return;
    }

    if (!activeSectionId || !nextIncomplete) {
      return;
    }

    const wasActiveIncomplete = previous.some(
      (assignment) =>
        assignment.curriculum_item_id === activeSectionId &&
        assignment.status !== "done" &&
        assignment.status !== "skipped",
    );
    const isActiveNowDone = assignments.some(
      (assignment) =>
        assignment.curriculum_item_id === activeSectionId &&
        (assignment.status === "done" || assignment.status === "skipped"),
    );

    if (wasActiveIncomplete && isActiveNowDone) {
      setSelectedSectionId(nextIncomplete.curriculum_item_id);
      userPickedSectionRef.current = false;
    }
  }, []);

  function handleSectionSelect(sectionId: string) {
    userPickedSectionRef.current = true;
    setAllCaughtUp(false);
    setSelectedSectionId(sectionId);
  }

  function resetArticleQueueState() {
    userPickedSectionRef.current = false;
    scheduleAssignmentsRef.current = [];
    setAllCaughtUp(false);
    setSelectedSectionId(null);
  }

  const refreshCurriculumList = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setIsLoadingList(false);
      setLoadError("Sign in to load your workspace.");
      return [];
    }

    setIsLoadingList(true);
    setLoadError(null);

    try {
      const curricula = await fetchCurriculumList(token);
      const paths = curricula.map(mapCurriculumListRow);
      setCurriculumPaths(paths);
      return paths;
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load curricula.");
      return [];
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  const loadCurriculumDetail = useCallback(async (curriculumId: string) => {
    const token = getAccessToken();
    if (!token) {
      setLoadError("Sign in to load your workspace.");
      return;
    }

    setIsLoadingDetail(true);
    setLoadError(null);

    try {
      const detail = await fetchCurriculumDetail(curriculumId, token);
      setLoadedCurriculum(detail);
      setCurriculumPaths((prev) =>
        prev.map((path) =>
          path.id === detail.id
            ? { id: detail.id, label: detail.label, status: path.status, note: detail.note }
            : path,
        ),
      );
    } catch (error) {
      setLoadedCurriculum(null);
      setLoadError(error instanceof Error ? error.message : "Could not load curriculum.");
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) {
          setIsLoadingList(false);
          setLoadError("Sign in to load your workspace.");
        }
        return;
      }

      setIsLoadingList(true);
      setLoadError(null);

      try {
        const curricula = await fetchCurriculumList(token);
        if (cancelled) {
          return;
        }

        const paths = curricula.map(mapCurriculumListRow);
        setCurriculumPaths(paths);
        setSelectedCurriculumId(paths[0]?.id ?? null);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load curricula.");
          setSelectedCurriculumId(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingList(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCurriculumId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) {
          setLoadError("Sign in to load your workspace.");
        }
        return;
      }

      setIsLoadingDetail(true);
      setLoadError(null);

      try {
        const detail = await fetchCurriculumDetail(selectedCurriculumId, token);
        if (cancelled) {
          return;
        }

        setLoadedCurriculum(detail);
        setCurriculumPaths((prev) =>
          prev.map((path) =>
            path.id === detail.id
              ? { id: detail.id, label: detail.label, status: path.status, note: detail.note }
              : path,
          ),
        );
      } catch (error) {
        if (!cancelled) {
          setLoadedCurriculum(null);
          setLoadError(error instanceof Error ? error.message : "Could not load curriculum.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDetail(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCurriculumId]);

  async function handleCurriculumCreated(curriculumId: string) {
    setShowCreatePanel(false);
    await refreshCurriculumList();
    setSelectedCurriculumId(curriculumId);
  }

  async function handleGenerateStructure(sprintDays: number) {
    if (!loadedCurriculum) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setGenerateError("Sign in to generate your curriculum structure.");
      return;
    }

    setGenerateError(null);
    setIsGeneratingStructure(true);

    try {
      await generateCurriculumStructure(loadedCurriculum.id, token, {
        autoEnrich: true,
        sprintDays,
      });
      await bootstrapScheduleAfterSyllabus(loadedCurriculum.id, token, { sprintDays });
      setScheduleRefreshKey((key) => key + 1);
      await loadCurriculumDetail(loadedCurriculum.id);
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Could not generate curriculum structure.");
    } finally {
      setIsGeneratingStructure(false);
    }
  }

  function handleSprintDaysUpdated(sprintDays: number) {
    setLoadedCurriculum((prev) => (prev ? { ...prev, sprintDays } : prev));
    setScheduleRefreshKey((key) => key + 1);
  }

  function handleCurriculumSelect(curriculumId: string) {
    setShowCreatePanel(false);
    resetArticleQueueState();
    setSelectedCurriculumId(curriculumId);
  }

  async function handleCurriculumLifecycle(curriculumId: string, action: CurriculumLifecycleAction) {
    const token = getAccessToken();
    if (!token) {
      setLoadError("Sign in to manage your curriculums.");
      return;
    }

    if (action === "delete") {
      const path = curriculumPaths.find((item) => item.id === curriculumId);
      const confirmed = window.confirm(
        `Delete "${path?.label ?? "this curriculum"}"? This cannot be undone.`,
      );
      if (!confirmed) {
        return;
      }
    }

    setLoadError(null);

    try {
      if (action === "delete") {
        await deleteCurriculum(curriculumId, token);
        const remaining = curriculumPaths.filter((path) => path.id !== curriculumId);
        setCurriculumPaths(remaining);

        if (selectedCurriculumId === curriculumId) {
          const nextId = remaining[0]?.id ?? null;
          setSelectedCurriculumId(nextId);
          if (!nextId) {
            setLoadedCurriculum(null);
          }
        }
        return;
      }

      const status = action === "activate" ? "active" : "archived";
      const updated = await updateCurriculumStatus(curriculumId, token, status);
      setCurriculumPaths((prev) =>
        prev.map((path) =>
          path.id === curriculumId
            ? { ...path, label: updated.title, status: updated.status ?? status }
            : path,
        ),
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not update curriculum.");
    }
  }

  function handleNoteChange(note: LoadedCurriculum["note"]) {
    setLoadedCurriculum((prev) => (prev ? { ...prev, note } : prev));
  }

  function handleNoteMetaChange(meta: { noteId: string | null; publicSlug: string | null }) {
    setLoadedCurriculum((prev) =>
      prev ? { ...prev, noteId: meta.noteId, publicSlug: meta.publicSlug } : prev,
    );
  }

  function handlePublishChange(settings: PublishSettings) {
    setLoadedCurriculum((prev) =>
      prev
        ? {
            ...prev,
            publicSlug: settings.public_slug,
            note: {
              ...prev.note,
              visibility: settings.is_published ? "Public" : "Private",
            },
          }
        : prev,
    );
  }

  const effectiveLoadedCurriculum =
    loadedCurriculum?.id === selectedCurriculumId ? loadedCurriculum : null;

  const activeSectionId = useMemo(() => {
    if (allCaughtUp) {
      return null;
    }
    const sections = effectiveLoadedCurriculum?.sections ?? [];
    if (!sections.length) {
      return null;
    }
    if (selectedSectionId && sections.some((section) => section.id === selectedSectionId)) {
      return selectedSectionId;
    }
    return sections[0]?.id ?? null;
  }, [effectiveLoadedCurriculum?.sections, selectedSectionId, allCaughtUp]);

  const activeSection =
    effectiveLoadedCurriculum?.sections.find((section) => section.id === activeSectionId) ??
    effectiveLoadedCurriculum?.sections[0] ??
    null;

  const hasActiveCurriculum = effectiveLoadedCurriculum != null;
  const showInitialCreatePanel = !isLoadingList && curriculumPaths.length === 0 && !loadError;
  const showInlineCreatePanel = showCreatePanel && curriculumPaths.length > 0;

  return (
    <main className="workspace-shell">
      <Sidebar
        activeHref="/workspace"
        showcaseSlug={
          effectiveLoadedCurriculum?.note.visibility === "Public"
            ? effectiveLoadedCurriculum.publicSlug
            : null
        }
        curriculums={curriculumPaths}
        selectedCurriculumId={selectedCurriculumId ?? ""}
        onCurriculumSelect={handleCurriculumSelect}
        onCurriculumLifecycle={handleCurriculumLifecycle}
        onAddCurriculum={() => setShowCreatePanel(true)}
        showCurriculumMenu
      />

      <section className="workspace-main">
        <Header />
        {loadError && (
          <p className="mt-6 text-base text-[#9A504A]" role="alert">
            {loadError}
          </p>
        )}
        {generateError && (
          <p className="mt-6 text-base text-[#9A504A]" role="alert">
            {generateError}
          </p>
        )}
        {isLoadingList && !loadError && (
          <p className="mt-6 text-base text-[var(--color-ink-muted)]">Loading your curriculums…</p>
        )}

        {(showInitialCreatePanel || showInlineCreatePanel) && (
          <div className="mt-10">
            <CreateCurriculumPanel onCreated={handleCurriculumCreated} />
          </div>
        )}

        {hasActiveCurriculum && effectiveLoadedCurriculum && (
          <div className="workspace-grid workspace-grid-relative">
            {isGeneratingStructure && (
              <div className="workspace-generating-overlay">
                <GardenSpinner message="Growing your curriculum structure…" />
              </div>
            )}

            <div
              className={`workspace-main-column ${isGeneratingStructure ? "workspace-panel-dimmed" : ""}`}
            >
              <NoteEditor
                note={effectiveLoadedCurriculum.note}
                curriculumId={effectiveLoadedCurriculum.id}
                curriculumTitle={effectiveLoadedCurriculum.label}
                noteId={effectiveLoadedCurriculum.noteId}
                resourceId={effectiveLoadedCurriculum.resourceId}
                publicSlug={effectiveLoadedCurriculum.publicSlug}
                section={activeSection}
                hasSyllabus={effectiveLoadedCurriculum.hasSyllabus}
                isLoading={isLoadingDetail}
                allCaughtUp={allCaughtUp}
                onNoteChange={handleNoteChange}
                onNoteMetaChange={handleNoteMetaChange}
              />

              <WorkspaceMainPanel
                curriculumId={effectiveLoadedCurriculum.id}
                folderId={effectiveLoadedCurriculum.folderId}
                gapSuggestions={effectiveLoadedCurriculum.gapSuggestions}
                hasSyllabus={effectiveLoadedCurriculum.hasSyllabus}
                isGeneratingStructure={isGeneratingStructure}
                onGenerateStructure={handleGenerateStructure}
              />
            </div>

            <UtilityPanel
              curriculumId={effectiveLoadedCurriculum.id}
              curriculumTitle={effectiveLoadedCurriculum.label}
              onPublishChange={handlePublishChange}
              hasSyllabus={effectiveLoadedCurriculum.hasSyllabus}
              sprintDays={effectiveLoadedCurriculum.sprintDays}
              scheduleRefreshKey={scheduleRefreshKey}
              sections={effectiveLoadedCurriculum.sections}
              selectedSectionId={activeSectionId}
              onSectionSelect={handleSectionSelect}
              onAssignmentsChange={handleAssignmentsChange}
              onSprintDaysUpdated={handleSprintDaysUpdated}
            />
          </div>
        )}

        {!hasActiveCurriculum && !showInitialCreatePanel && !showInlineCreatePanel && !isLoadingList && curriculumPaths.length > 0 && (
          <p className="mt-10 text-base text-[var(--color-ink-muted)]">
            {isLoadingDetail
              ? "Loading curriculum details…"
              : "Please select or create a curriculum to view details."}
          </p>
        )}
      </section>
    </main>
  );
}
