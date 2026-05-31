"use client";

export const MIN_RESOURCES_FOR_STRUCTURE = 5;

type GenerateStructureButtonProps = {
  disabled?: boolean;
  isGenerating?: boolean;
  resourceCount: number;
  onGenerate: () => void;
};

export function GenerateStructureButton({
  disabled,
  isGenerating,
  resourceCount,
  onGenerate,
}: GenerateStructureButtonProps) {
  const hasEnoughResources = resourceCount >= MIN_RESOURCES_FOR_STRUCTURE;
  const canGenerate = hasEnoughResources && !disabled && !isGenerating;

  return (
    <>
      <button
        type="button"
        className="generate-structure-btn"
        onClick={onGenerate}
        disabled={!canGenerate}
        aria-describedby="generate-structure-helper"
      >
        {isGenerating ? "Generating structure…" : "Generate Curriculum Structure"}
      </button>

      <p
        id="generate-structure-helper"
        className={
          hasEnoughResources
            ? "generate-structure-hint generate-structure-hint-ready"
            : "generate-structure-hint"
        }
        role="status"
        aria-live="polite"
      >
        {hasEnoughResources
          ? "Your learning tree is ready to sprout!"
          : "Add at least 5 learning resources to let your learning tree sprout."}
      </p>
    </>
  );
}
