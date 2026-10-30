import { studies, studyFrame } from "../src/hover-studies.js";

export const hoverBody = `<section class="hover-board" data-hover-board aria-labelledby="hover-title">
  <header class="hover-heading">
    <h1 id="hover-title">Hover Lab</h1>
    <p>Nine wire studies, shown enlarged. The site’s actual hover effect is unchanged.</p>
    <div class="hover-controls">
      <button type="button" class="text-action" data-compare-all aria-pressed="false" hidden>Compare all</button>
      <p role="status" aria-label="Motion status" data-hover-status>Hover or focus a study. Click or tap to hold; again to stop.</p>
    </div>
    <p data-hover-static>JavaScript animates these studies. All nine structures are also available here as static previews.</p>
  </header>
  <div class="hover-grid">
    ${studies
      .map((study, index) => {
        const number = String(index + 1).padStart(2, "0");
        const frame = studyFrame(study.id);
        return `<figure class="hover-study" data-hover-study="${study.id}" data-running="false">
        <button class="hover-sample" type="button" aria-labelledby="study-${number}" aria-describedby="study-description-${number}" aria-pressed="false" disabled>
          <svg viewBox="-64 -64 128 128" width="160" height="160" aria-hidden="true" focusable="false"><path class="study-back" d="${frame.back}"/><path class="study-front" d="${frame.front}"/><path class="study-accent" d="${frame.accent}"/></svg>
          <span class="hover-sample-label">preview motion</span>
        </button>
        <figcaption><h2 id="study-${number}"><span class="study-number">${number}</span> ${study.name}</h2><p id="study-description-${number}">${study.description}</p></figcaption>
      </figure>`;
      })
      .join("")}
  </div>
</section>`;
