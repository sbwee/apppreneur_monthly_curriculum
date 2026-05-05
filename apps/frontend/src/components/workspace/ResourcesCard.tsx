"use client";

import { useState } from "react";
import {
  randomResourcePool,
  WorkspaceResource,
  workspaceResources,
} from "@/src/data/mockWorkspace";

export function ResourcesCard() {
  const [resources, setResources] = useState<WorkspaceResource[]>(workspaceResources);

  function handleAddResource() {
    const randomTemplate =
      randomResourcePool[Math.floor(Math.random() * randomResourcePool.length)];

    const newResource: WorkspaceResource = {
      ...randomTemplate,
      id: `${randomTemplate.type.toLowerCase()}-${Date.now()}`,
    };

    setResources((prev) => [newResource, ...prev]);
  }

  return (
    <section className="mt-8">
      <h2 className="utility-heading">Resources</h2>
      <div className="mt-4 space-y-3">
        {resources.map((resource) => (
          <article key={resource.id} className="resource-item">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                {resource.type}
              </p>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-[#2C3C33]">{resource.title}</h3>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{resource.description}</p>
          </article>
        ))}
      </div>

      <button type="button" className="add-resource-btn" onClick={handleAddResource}>
        Add Resource
      </button>
    </section>
  );
}
