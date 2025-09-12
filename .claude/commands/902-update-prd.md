# Rule: Updating an Existing Product Requirements Document (PRD)

## Goal

To guide an AI assistant in updating an existing Markdown Product Requirements Document (PRD) based on a user's requested changes. The updated PRD should remain clear, actionable, and suitable for a junior developer to understand and implement the feature.

## Process

1.  **Load Current Context:** Read @.claude/current-prd.md to get the current PRD file path from the configuration.
2.  **Receive Update Request:** The user describes the desired changes to the current PRD.
3.  **Analyse Existing PRD:** Read the PRD file specified in the configuration, verify that all standard PRD sections (see *PRD Structure* below) are present, and identify which sections are impacted or missing.
4.  **Ask Targeted Clarifying Questions:** Based on the update request, ask follow-up questions focused on the affected or missing sections.
5.  **Generate Updated Sections:** Rewrite, append, or remove content in the identified or missing sections while leaving all other content unchanged. If a required section is absent or lacks essential detail (e.g., **Success Metrics**, **Design Considerations**), gather the needed information through clarifying questions and then add or complete that section.
6.  **Save Updated PRD:** Overwrite the existing PRD file with the modified document.

## Clarifying Questions (Examples)

The AI should adapt its questions based on the prompt, but here are some common areas to explore:

*   **Problem/Goal:** "What problem does this feature solve for the user?" or "What is the main goal we want to achieve with this feature?"
*   **Target User:** "Who is the primary user of this feature?"
*   **Core Functionality:** "Can you describe the key actions a user should be able to perform with this feature?"
*   **User Stories:** "Could you provide a few user stories? (e.g., As a [type of user], I want to [perform an action] so that [benefit].)"
*   **Acceptance Criteria:** "How will we know when this feature is successfully implemented? What are the key success criteria?"
*   **Scope/Boundaries:** "Are there any specific things this feature *should not* do (non-goals)?"
*   **Data Requirements:** "What kind of data does this feature need to display or manipulate?"
*   **Design/UI:** "Are there any existing design mockups or UI guidelines to follow?" or "Can you describe the desired look and feel?"
*   **Edge Cases:** "Are there any potential edge cases or error conditions we should consider?"

## PRD Structure

The generated PRD should include the following sections:

1.  **Introduction/Overview:** Briefly describe the feature and the problem it solves. State the goal.
2.  **Goals:** List the specific, measurable objectives for this feature.
3.  **User Stories:** Detail the user narratives describing feature usage and benefits.
4.  **Functional Requirements:** List the specific functionalities the feature must have. Use clear, concise language (e.g., "The system must allow users to upload a profile picture."). Number these requirements.
5.  **Non-Goals (Out of Scope):** Clearly state what this feature will *not* include to manage scope.
6.  **Design Considerations (Optional):** Link to mockups, describe UI/UX requirements, or mention relevant components/styles if applicable.
7.  **Technical Considerations (Optional):** Mention any known technical constraints, dependencies, or suggestions (e.g., "Should integrate with the existing Auth module").
8.  **Success Metrics:** How will the success of this feature be measured? (e.g., "Increase user engagement by 10%", "Reduce support tickets related to X").
9.  **Open Questions:** List any remaining questions or areas needing further clarification.
10. *(Ensure any newly added mandatory sections follow the same formatting conventions.)*

## Target Audience

Assume the primary reader of the PRD is a **junior developer**. Therefore, requirements should be explicit, unambiguous, and avoid jargon where possible. Provide enough detail for them to understand the feature's purpose and core logic.

## Output

*   **Format:** Markdown (`.md`)
*   **Location:** `${PROJECT_ROOT}/docs/tasks/`
*   **Filename:** `prd-[feature-name].md`

## Final instructions

1. Do NOT start implementing the PRD
2. Make sure to ask the user clarifying questions
3. Take the user's answers to the clarifying questions and improve the PRD