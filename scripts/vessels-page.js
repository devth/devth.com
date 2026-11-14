import { slug as slugify } from "github-slugger";
import { defaults, renderers, readout, k, LANDMARKS } from "../src/vessels-figures.js";
import { CIRCUIT } from "../src/vessels-models.js";

const WIDTH = 740;
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );

const O2 = k("O₂");
const CO2 = k("CO₂");
const PO2 = k("PO₂");
const mmHg = k("mmHg");
const um = k("µm");

function range(key, label, { min, max, step, value, scale, log }) {
  const attrs = [
    `type="range"`,
    `id="vx-${key}"`,
    `min="${min}"`,
    `max="${max}"`,
    `step="${step}"`,
    `value="${value}"`,
    `data-vx-key="${key}"`,
    scale ? `data-vx-scale="${scale}"` : "",
    log ? `data-vx-log="${log}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<label class="vx-range" for="vx-${key}"><span>${label}</span><input ${attrs}><output for="vx-${key}" data-vx-output="${key}"></output></label>`;
}
const button = (label, set) =>
  `<button type="button" class="text-action" data-vx-set='${escape(JSON.stringify(set))}'>${label}</button>`;
const presets = (label, items) =>
  `<div class="vx-presets" role="group" aria-label="${escape(label)}">${items.join("")}</div>`;

const controls = {
  circuit: `<fieldset class="vx-choices"><legend class="sr-only">Vessel level</legend>${CIRCUIT.map(
    ({ id, name }) =>
      `<label><input type="radio" name="vx-level" value="${id}" data-vx-key="level"${id === defaults.circuit.level ? " checked" : ""}><span>${name}</span></label>`,
  ).join("")}</fieldset>`,
  radius: range("radius", "arteriole radius", {
    min: 50,
    max: 150,
    step: 1,
    value: defaults.radius.radius * 100,
    scale: 0.01,
  }),
  tube:
    range("rbc", `red cell count (${k("RBC")})`, {
      min: 2.5,
      max: 7,
      step: 0.05,
      value: defaults.tube.rbc,
    }) +
    range("mcv", `cell size (${k("MCV")})`, {
      min: 60,
      max: 120,
      step: 1,
      value: defaults.tube.mcv,
    }) +
    range("mch", `hemoglobin per cell (${k("MCH")})`, {
      min: 20,
      max: 40,
      step: 0.5,
      value: defaults.tube.mch,
    }) +
    `<button type="button" class="text-action" data-vx-replay>spin again</button>`,
  curve:
    range("po2", `${PO2}`, { min: 0, max: 120, step: 1, value: defaults.curve.po2 }) +
    presets(
      "Oxygen pressure presets",
      LANDMARKS.map(({ po2, name }) => button(name, { po2 })),
    ) +
    `<label class="vx-check"><input type="checkbox" data-vx-key="shifted"><span>warm, acidic tissue (shift right)</span></label>`,
  content:
    range("hb", "hemoglobin", { min: 5, max: 20, step: 0.1, value: defaults.content.hb }) +
    presets("Hemoglobin presets", [
      button(`typical, 15 ${k("g/dL")}`, { hb: 15 }),
      button(`anemia, 8 ${k("g/dL")}`, { hb: 8 }),
    ]),
  viscosity:
    range("hct", "hematocrit", {
      min: 10,
      max: 70,
      step: 1,
      value: defaults.viscosity.hct * 100,
      scale: 0.01,
    }) +
    range("diameter", "tube diameter", { min: 0, max: 1000, step: 1, value: 1000, log: "5,1000" }) +
    presets("Tube presets", [
      button(`1 ${k("mm")}`, { diameter: 1000 }),
      button(`arteriole, 30 ${um}`, { diameter: 30 }),
      button(`capillary, 7 ${um}`, { diameter: 7 }),
    ]),
  capillary:
    range("oncotic", "oncotic pressure", {
      min: 10,
      max: 35,
      step: 1,
      value: defaults.capillary.oncotic,
    }) +
    range("arterial", "capillary pressure at arteriole end", {
      min: 25,
      max: 50,
      step: 1,
      value: defaults.capillary.arterial,
    }),
  guards:
    `<button type="button" class="text-action" data-vx-play aria-pressed="false">play</button>` +
    range("time", "time", { min: 0, max: 14, step: 0.1, value: defaults.guards.time }) +
    presets("Hemostasis stages", [
      button("intact", { time: 0.5 }),
      button("spasm", { time: 2.2 }),
      button("platelet plug", { time: 6 }),
      button("fibrin", { time: 10.5 }),
    ]),
};

function figure(kind, number, caption, { wide = false } = {}) {
  const state = defaults[kind];
  return `<figure class="vx-figure${wide ? " vx-wide" : ""}" data-vx-figure="${kind}" aria-labelledby="vx-caption-${kind}">
  <div class="vx-controls" data-vx-controls hidden>${controls[kind]}</div>
  <div class="vx-plot" data-vx-plot>${renderers[kind](state, WIDTH, 1.6)}</div>
  <p class="vx-readout" data-vx-readout${kind === "guards" ? "" : ' aria-live="polite"'}>${readout(kind, state)}</p>
  <figcaption id="vx-caption-${kind}"><span class="vx-figure-number">fig. ${number}</span> ${caption}</figcaption>
</figure>`;
}

const sections = [
  {
    title: "From arteries to veins",
    body: `<p>Blood leaves the heart through the aorta and branches into smaller arteries, then into arterioles, then into capillaries, where exchange with the tissue happens. Capillaries merge into venules, venules into veins, and the venae cavae carry blood back to the heart.</p>
<p>Each step down in size multiplies the number of vessels. A single capillary is only 5 to 10 ${um} across, but there are so many that their combined cross-section is about a thousand times the aorta's. The same volume of blood has to cross every level each second, so where the total cross-section is wide, blood moves slowly. In the capillaries it averages about a third of a millimeter per second, which gives oxygen time to diffuse out.</p>
${figure("circuit", 1, `Each lane moves at its level's mean speed, to scale: the aorta's cells streak by while the capillaries' barely creep. Speeds are computed from Guyton and Hall's total cross-sectional areas, with the same flow through every level. Choose a level to see its wall.`)}
<p>Most vessel walls have three layers. The tunica intima is a lining of flat endothelial cells. The tunica media is smooth muscle and elastic fiber, and it is thickest in arteries. The tunica externa is connective tissue that anchors the vessel in place, and it is usually the thickest layer in veins. Capillaries keep only the endothelium and the thin basement membrane beneath it.</p>`,
  },
  {
    title: "How arterioles control flow",
    body: `<p>Arterioles, the last branches before the capillaries, have one or two layers of smooth muscle in their walls. Tightening or relaxing that muscle changes their radius, and radius has an outsized effect on flow. For steady flow through a tube, Poiseuille's law gives</p>
<p class="vx-equation">flow = π × ${k("ΔP")} × ${k("r")}⁴ ÷ (8 × η × ${k("L")})</p>
<p>where ${k("ΔP")} is the pressure difference along the tube, ${k("r")} its radius, η the fluid's viscosity, and ${k("L")} its length. At the same pressure difference, flow scales with the fourth power of the radius. An arteriole at half its radius passes one sixteenth of the flow.</p>
${figure("radius", 2, `Cells near the center move faster than cells near the wall: the parabolic profile of steady tube flow, computed for each cell. Below, flow relative to the resting radius; the dashed line is what flow would do if it were simply proportional to radius.`)}
<p>That sensitivity makes arterioles the site of greatest resistance in the circulation, and the main way the body steers blood toward the tissues that need it. Blood is not a simple fluid and arterioles are not rigid pipes, so Poiseuille's law is an approximation here. The steep dependence on radius is the part that holds.</p>`,
  },
  {
    title: "What hematocrit measures",
    body: `<p>Spin a tube of blood in a centrifuge and it separates. Red cells, the heaviest part, pack at the bottom. Above them sits a thin pale layer called the buffy coat, which holds the white cells and platelets and is normally under 1% of the sample. On top is plasma: straw-colored, about 92% water, and carrying proteins, salts, nutrients, hormones and waste.</p>
<p>Hematocrit is the red layer's share of the tube. It depends on two other numbers in a blood count: the red cell count (${k("RBC")}), which says how many cells are in a microliter, and the mean corpuscular volume (${k("MCV")}), which says how big the average cell is. Multiply them and you get the fraction of the blood that is red cell. Hemoglobin follows the same pattern, from the count and the average hemoglobin per cell (${k("MCH")}). The ratio of the two, ${k("MCHC")}, is how concentrated hemoglobin is inside the cells.</p>
${figure("tube", 3, `The tube settles from mixed to layered. In the magnified sample, the share of the square covered by cells approximately matches the hematocrit; cell size follows ${k("MCV")} and pale centers grow as ${k("MCHC")} falls. Brackets beside the tube are MedlinePlus adult reference ranges for hematocrit, male (m) and female (f).`)}
<p>${k("MCHC")} normally falls between 32 and 36 ${k("g/dL")}, so hematocrit tends to be about three times the hemoglobin number. A smaller cell with less hemoglobin in it changes both the hematocrit and the hemoglobin, even with a normal cell count. Reference ranges differ between labs, and between sources: your lab report lists its own.</p>`,
  },
  {
    title: "How hemoglobin picks up and lets go",
    body: `<p>Each hemoglobin molecule is four protein chains, and each chain holds an iron-containing heme that can bind one ${O2}. A red cell carries about 300 million of these molecules. In the lungs, where the partial pressure of oxygen (${PO2}) is about 100 ${mmHg}, nearly every site fills. In the tissues, ${PO2} is lower, and some of the oxygen lets go.</p>
<p>The relationship is not a straight line. Binding is cooperative: as more oxygen binds to a hemoglobin molecule, its remaining sites bind more readily. That makes the curve ${k("S")}-shaped. Its top is flat, so arterial blood stays almost fully loaded even if lung ${PO2} dips: at 80 ${mmHg} it is still about 96% saturated. Its middle is steep, and that is the range blood passes through in the tissues. Blood leaving resting tissue is near 40 ${mmHg}. Working muscle can lower its ${PO2} to about 20, so blood passing through it gives up far more.</p>
${figure("curve", 4, `The line is Severinghaus's 1979 equation; the dots are the standard human curve it was fitted to, at 37 °${k("C")} and ${k("pH")} 7.4. Drag along the chart or use the slider. The red cell shows 12 of its roughly 300 million hemoglobin molecules, with four oxygen sites each.`)}
<p>Working tissue also changes the curve. It is warmer and more acidic, and it makes more ${CO2}; each of these loosens hemoglobin's grip on oxygen and moves the curve to the right. (The effect of acidity is called the Bohr effect.) The toggle moves the curve so that half-saturation falls at 32 ${mmHg} instead of 26.9. That size of shift is illustrative, but the direction is real: at the same ${PO2}, the shifted curve gives up more.</p>
<p>Saturation is a percentage. It says how full the hemoglobin is, not how much hemoglobin there is. Oxygen content puts the two together:</p>
<p class="vx-equation">${O2} content = 1.34 × ${k("Hb")} × ${k("SO₂")} + 0.003 × ${PO2}</p>
<p>Here ${k("Hb")} is in ${k("g/dL")} and ${k("SO₂")} is written as a fraction (0.98, not 98%). Each gram of fully saturated hemoglobin holds about 1.34 ${k("mL")} of oxygen. The second term is oxygen dissolved in plasma, which is small: 0.3 ${k("mL")} per deciliter at 100 ${mmHg}, next to about 20 ${k("mL")} bound to hemoglobin.</p>
${figure("content", 5, `Oxygen per deciliter of blood, computed from the equation for arterial blood and for venous blood leaving resting tissue. The bracket is what each deciliter delivered. The thin dark sliver at the end of each bar is dissolved oxygen.`)}
<p>Lower the hemoglobin and saturation stays at 98% while content falls with it. A pulse oximeter, which reads saturation, can look normal in someone with anemia.</p>`,
  },
  {
    title: "More red cells is not always better",
    body: `<p>If hemoglobin carries the oxygen, why not pack in more red cells? Because they make blood thicker. Blood's viscosity rises steeply with hematocrit, and at a fixed pressure, flow falls as viscosity rises. The oxygen a vessel delivers each second is roughly the cells per milliliter times the milliliters per second, so the two effects pull against each other.</p>
<p>The figure uses an empirical law that Pries, Neuhaus and Gaehtgens fitted in 1992 to decades of measurements of human blood flowing through glass tubes. In a tube a millimeter wide, oxygen carried per unit of pressure peaks at a hematocrit near 40%, and the peak is broad: 45% gets almost all of it.</p>
${figure("viscosity", 6, `Top: red cells at the chosen hematocrit, moving at a speed set by the computed viscosity, past a counting line. The charts are the Pries viscosity law and hematocrit divided by viscosity, a proxy for oxygen carried at a fixed pressure. The diameter chart shows viscosity across tube sizes at the chosen hematocrit.`, { wide: true })}
<p>Narrow tubes behave differently. Below about 300 ${um}, blood gets less viscous as the tube narrows, down to a minimum near 7 ${um}: in a 40 ${um} tube it is about 65% as viscous as in a 300 ${um} one. Red cells deform and leave a lubricating layer of cell-free plasma along the wall. This is the Fåhræus–Lindqvist effect, and in narrow tubes it moves the optimum toward higher hematocrit.</p>
<p>Two cautions. These are glass-tube measurements, and in living microvessels a layer of molecules lining the vessel wall makes the apparent viscosity higher than this. The body also does not hold pressure fixed: when oxygen content falls, cardiac output and oxygen extraction both rise. The model shows the trade-off, not the body's set point.</p>`,
  },
  {
    title: "Single file through the capillary",
    body: `<p>The narrowest capillaries are about as wide as a red cell, which is 7 to 8 ${um} across, so cells pass one at a time and fold to fit. The capillary wall is a single cell thick. Oxygen diffuses out to the tissue and ${CO2} diffuses in. About 70% of that ${CO2} rides back to the lungs as bicarbonate in plasma, about 20% on hemoglobin, and the rest dissolved.</p>
<p>Fluid moves too. Blood pressure inside the capillary pushes water out through the wall. Plasma proteins, mostly albumin, are too large to follow, and they draw water back in by osmosis; that pull is called oncotic pressure. In the textbook picture, pressure wins at the arteriole end and the proteins win at the venule end. A little more leaves than returns, about 24 liters a day against 20.4, and lymphatic vessels collect the difference and return it to the blood.</p>
${figure("capillary", 7, `Red cells darken as they unload: color follows saturation on the curve from figure 4, with ${PO2} assumed to fall from 100 to 40 ${mmHg} along the capillary (illustrative). Arrows on the wall show net fluid movement, computed from the chart below. Default pressures are the classic values from OpenStax: 35 falling to 18 ${mmHg}, against 25 ${mmHg} of oncotic pressure. This is the classic model; the revised view below changes the venule end.`)}
<p>Levick and Michel (2010) revised this picture. The layer that holds plasma proteins back is the glycocalyx, a coating of molecules on the inner surface of the endothelium. The oncotic pull that matters is the one across that coating, and fluid flowing out through the narrow clefts between endothelial cells keeps the protein concentration just beneath it different from the tissue fluid's. Direct observations show that reabsorption in most tissues is only transient. In the steady state there is slight filtration along the whole capillary, even in venules, and lymph carries that fluid back. Sustained reabsorption happens in specialized places such as the kidney and the lining of the intestine.</p>`,
  },
  {
    title: "White cells and platelets",
    body: `<p>Red cells vastly outnumber everything else in blood. Taking the middle of each reference range, a microliter holds about 5 million red cells, 275,000 platelets and 7,750 white cells: about 670 red cells and 35 platelets for every white cell.</p>
<p>Unlike red cells, white cells routinely leave the bloodstream to work in the tissues. Near an infection, they slow and roll along the vessel wall, mostly in small venules, then stick, then squeeze between endothelial cells into the tissue (emigration, or diapedesis), and follow chemical signals to the source.</p>
<p>Platelets are fragments of much larger cells, 2 to 4 ${um} across, and they patch leaks. When a vessel wall breaks, three things overlap. The smooth muscle in the wall contracts (vascular spasm). Platelets stick to the exposed collagen and to each other, turning spiky and sticky (the platelet plug). And clotting factors in the plasma turn fibrinogen into threads of fibrin, a mesh that traps cells and binds the plug into a clot (coagulation).</p>
${figure("guards", 8, `The dot field is one microliter scaled down to a single white cell, keeping the proportions. The vessel scene is a small breach, looping through the three overlapping stages of hemostasis, while further along the wall a white cell squeezes out toward bacteria in the tissue. Schematic and not to scale.`, { wide: true })}`,
  },
];

const sources = [
  [
    "OpenStax, Anatomy and Physiology 2e, chapters 18, 20 and 22",
    "https://openstax.org/books/anatomy-and-physiology-2e/pages/18-1-an-overview-of-blood",
  ],
  [
    "MedlinePlus, CBC blood test (reference ranges)",
    "https://medlineplus.gov/ency/article/003642.htm",
  ],
  [
    `Severinghaus, Simple, accurate equations for human blood ${O2} dissociation computations (1979, revised 2007)`,
    "https://www.nickalls.org/dick/papers/anes/JWSrevised2007.pdf",
  ],
  [
    "Collins et al., Relating oxygen partial pressure, saturation and content (Breathe, 2015)",
    "https://pmc.ncbi.nlm.nih.gov/articles/PMC4666443/",
  ],
  [
    "Secomb and Pries, Blood viscosity in microvessels: experiment and theory (restating Pries et al. 1992)",
    "https://pmc.ncbi.nlm.nih.gov/articles/PMC4117233/",
  ],
  [
    "Levick and Michel, Microvascular fluid exchange and the revised Starling principle (2010)",
    "https://doi.org/10.1093/cvr/cvq062",
  ],
  [
    "Leick et al., Leukocyte recruitment in inflammation (2014)",
    "https://pmc.ncbi.nlm.nih.gov/articles/PMC3994997/",
  ],
  [
    "Guyton and Hall, Textbook of Medical Physiology, 12th ed., ch. 14 (cross-sectional areas and velocities)",
    null,
  ],
];

const headings = [...sections.map(({ title }) => title), "Sources"].map((title) => ({
  title,
  id: slugify(title),
}));

export const vesselsBody = `<header class="article-header vessels-header">
  <h1>Vessels</h1>
  <p class="article-deck">How blood carries oxygen through the body, and what hematocrit, hemoglobin and the rest of a blood count are measuring.</p>
</header>
<div class="reading-layout standalone-reading with-toc">
  <div class="article-toc" data-toc><nav aria-label="on this page"><svg aria-hidden="true" width="24"><path class="toc-track"/><path class="toc-progress" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/><path class="toc-arrival" pathLength="1"/></svg><ol>${headings.map(({ id, title }) => `<li><a href="#${id}" data-depth="0" style="--toc-depth:0">${escape(title)}</a></li>`).join("")}</ol></nav></div>
  <article class="prose vessels" data-vessels>
    <p>An adult carries 4 to 6 liters of blood, and at rest the heart moves about 5 liters of it through the vessels every minute. Much of a routine blood count describes that cargo: how many red cells there are, how big they are, and how much hemoglobin they hold. Whether the oxygen reaches the tissue depends on the vessels as well. The figures below are working models; drag, scrub and toggle them.</p>
    <p class="vx-aside">An educational model, not medical advice.</p>
    ${sections.map(({ title, body }, index) => `<h2 id="${headings[index].id}">${escape(title)}</h2>\n${body}`).join("\n")}
    <h2 id="${headings.at(-1).id}">Sources</h2>
    <ul class="vx-sources">${sources.map(([title, url]) => `<li>${url ? `<a href="${url}">${title}</a>` : title}</li>`).join("")}</ul>
    <p class="vx-aside">Every number on this page is checked against these sources in a claims ledger, <a href="https://github.com/devth/devth.com/blob/master/docs/vessels-ledger.md">docs/vessels-ledger.md</a>. Figures compute their values from the models when you move them.</p>
  </article>
</div>`;
