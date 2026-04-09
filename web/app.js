const form = document.getElementById('generationForm');
const statusLabel = document.getElementById('statusLabel');
const timerValue = document.getElementById('timerValue');
const resultStream = document.getElementById('resultStream');
const requestPreview = document.getElementById('requestPreview');
const gaussianInput = document.getElementById('gaussianInput');
const gaussianValue = document.getElementById('gaussianValue');
const settingsDrawer = document.getElementById('settingsDrawer');
const settingsToggle = document.getElementById('settingsToggle');
const settingsClose = document.getElementById('settingsClose');
const generateButton = document.getElementById('generateButton');
const languageToggle = document.getElementById('languageToggle');

const stepsInput = document.getElementById('stepsInput');
const seedInput = document.getElementById('seedInput');
const guidanceInput = document.getElementById('guidanceInput');
const resolutionSelect = document.getElementById('resolutionSelect');
const promptTemplateInput = document.getElementById('promptTemplateInput');
const templateNameInput = document.getElementById('templateNameInput');
const templateSelect = document.getElementById('templateSelect');
const saveTemplateButton = document.getElementById('saveTemplateButton');
const updateTemplateButton = document.getElementById('updateTemplateButton');
const reuseTemplateButton = document.getElementById('reuseTemplateButton');
const deleteTemplateButton = document.getElementById('deleteTemplateButton');
const templateCount = document.getElementById('templateCount');
const aspectRatioSelect = document.getElementById('aspectRatioSelect');
const previewLimitInput = document.getElementById('previewLimitInput');
const historyDivider = document.getElementById('historyDivider');
const cpuUsage = document.getElementById('cpuUsage');
const memoryUsage = document.getElementById('memoryUsage');
const gpuUsage = document.getElementById('gpuUsage');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxDownload = document.getElementById('lightboxDownload');
const lightboxClose = document.getElementById('lightboxClose');

const TEMPLATE_STORAGE_KEY = 'zimage.prompt.templates';
const HISTORY_STORAGE_KEY = 'zimage.generation.history';
const LANGUAGE_STORAGE_KEY = 'zimage.ui.language';
const jobs = new Map();
let dashboardTimerHandle = null;
let systemTimerHandle = null;
let currentLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'zh';

const resolutionProfiles = {
  '1080p': 1080,
  '2k': 2048,
  '4k': 3840
};

const defaultTemplates = [
  {
    name: '像素风格',
    body: 'pixel-art illustration, arcade palette, crisp edges, retro game lighting, clean silhouette, square brush texture'
  },
  {
    name: '真实风格',
    body: 'photorealistic, natural materials, realistic skin and lighting, camera depth, cinematic composition, high detail'
  },
  {
    name: '美式动漫风格',
    body: 'american cartoon style, bold outlines, expressive faces, saturated cel shading, playful motion, stylized anatomy'
  },
  {
    name: '小新漫画风格',
    body: 'crayon comic style, simple childlike lines, flat pastel colors, humorous slice-of-life framing, rounded character shapes'
  },
  {
    name: '科学解释风格',
    body: 'science explainer illustration, educational infographic framing, clean labels, diagrammatic composition, clear subject isolation'
  }
];

const translations = {
  zh: {
    subtitle: '输入提示词，调整尺寸与分辨率，在高饱和像素瀑布流里生成图像。',
    languageToggle: 'EN',
    advancedSettings: '高级设置',
    prompt: '提示词',
    promptPlaceholder: '描述你想生成的画面...',
    styleTemplate: '风格模板',
    styleTemplatePlaceholder: '可复用的风格模板...',
    styleTemplateName: '风格模板名称',
    styleTemplateNamePlaceholder: '例如：像素海报',
    width: '宽度',
    height: '高度',
    count: '张数',
    resolution: '分辨率',
    aspectRatio: '画幅比例',
    custom: '自定义',
    previewLimit: '预览上限',
    generate: '生成',
    elapsed: '耗时',
    idle: '空闲',
    activeCount: '{count} 个任务进行中',
    styleTemplates: '风格模板',
    savedStyleTemplate: '已保存风格模板',
    chooseSavedTemplate: '选择已保存模板',
    noSavedTemplates: '暂无已保存模板',
    lastJobPlaceholder: '最近一次任务详情会显示在这里。',
    emptyState: '结果流会显示在这里。点击“生成”即可加入一个或多个并发任务。',
    history: '历史记录',
    comfyControls: 'Comfy 参数',
    fineTuning: '精细调参',
    close: '关闭',
    steps: '步数',
    seed: '种子',
    guidance: '引导强度',
    gaussianBlur: '高斯模糊',
    drawerFooter: '这些参数会控制 Z-Image-Turbo，刷新页面前会一直保留。',
    download: '下载',
    previewImage: '预览图片',
    downloadImage: '下载图片',
    savedCount: '已保存 {count} 个',
    loaded: '已载入',
    saved: '已保存',
    updated: '已更新',
    deleted: '已删除',
    reused: '已复用',
    cancel: '取消',
    promptReused: '提示词已复用：任务设置已回填到表单。',
    selectTemplateToEdit: '请先选择一个模板再编辑。',
    selectTemplateToDelete: '请先选择一个模板再删除。',
    selectTemplateToReuse: '请先选择一个已保存模板再复用。',
    templateSaveRequired: '保存时必须填写风格模板名称和风格模板内容。',
    noStyleTemplateToSave: '该任务没有可保存的风格模板。',
    deletedTemplate: '模板已删除。',
    taskLabel: '任务',
    adhocPromptTask: '临时任务',
    queued: '排队中',
    running: '生成中',
    processing: '处理中',
    starting: '启动中',
    pending: '等待中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
    offline: '离线',
    promptLabel: '提示词',
    styleTemplateLabel: '风格模板',
    sizeLabel: '尺寸',
    resolutionLabel: '分辨率',
    aspectRatioLabel: '画幅比例',
    stepsSeedLabel: '步数 / 种子',
    countLabel: '张数',
    noteLabel: '提示',
    imageMissing: '图片文件缺失。',
    savedGeneration: '已保存生成结果',
    reusePrompt: '复用提示词',
    saveAsStyle: '保存为风格',
    cancelTask: '取消任务',
    generationFailed: '生成失败：{message}',
    generationCancelled: '生成已取消。',
    unableToReach: '无法连接本地生成服务。',
    failedToStartGeneration: '启动生成失败',
    previewPrompt: '提示词',
    previewSize: '尺寸',
    previewCount: '张数',
    previewSteps: '步数',
    previewSeed: '种子',
    random: '随机',
    previewGuidance: '引导强度',
    previewGaussian: '高斯模糊'
  },
  en: {
    subtitle: 'Input prompts, adjust size and resolution, and generate images in a saturated pixel waterfall.',
    languageToggle: '中文',
    advancedSettings: 'Advanced Settings',
    prompt: 'Prompt',
    promptPlaceholder: 'Describe the scene you want to generate...',
    styleTemplate: 'Style Template',
    styleTemplatePlaceholder: 'Reusable style template...',
    styleTemplateName: 'Style Template Name',
    styleTemplateNamePlaceholder: 'e.g. Pixel Poster',
    width: 'Width',
    height: 'Height',
    count: 'Count',
    resolution: 'Resolution',
    aspectRatio: 'Aspect Ratio',
    custom: 'Custom',
    previewLimit: 'Preview Limit',
    generate: 'Generate',
    elapsed: 'Elapsed',
    idle: 'Idle',
    activeCount: '{count} Active',
    styleTemplates: 'Style Templates',
    savedStyleTemplate: 'Saved Style Template',
    chooseSavedTemplate: 'Choose a saved template',
    noSavedTemplates: 'No saved templates yet',
    lastJobPlaceholder: 'Last job details will appear here.',
    emptyState: 'Results will appear here. Click Generate to queue one or more concurrent jobs.',
    history: 'History',
    comfyControls: 'Comfy Controls',
    fineTuning: 'Fine Tuning',
    close: 'Close',
    steps: 'Steps',
    seed: 'Seed',
    guidance: 'Guidance',
    gaussianBlur: 'Gaussian Blur',
    drawerFooter: 'These knobs control Z-Image-Turbo and persist until you refresh the page.',
    download: 'Download',
    previewImage: 'Preview image',
    downloadImage: 'Download image',
    savedCount: '{count} saved',
    loaded: 'Loaded',
    saved: 'Saved',
    updated: 'Updated',
    deleted: 'Deleted',
    reused: 'Reused',
    cancel: 'Cancel',
    promptReused: 'Prompt reused: task settings copied back to the form.',
    selectTemplateToEdit: 'Select a template first to edit it.',
    selectTemplateToDelete: 'Select a template first to delete it.',
    selectTemplateToReuse: 'Select a saved template to reuse it.',
    templateSaveRequired: 'Style template name and style template are required to save.',
    noStyleTemplateToSave: 'This task has no style template to save.',
    deletedTemplate: 'Template removed.',
    taskLabel: 'Task',
    adhocPromptTask: 'Ad-hoc Task',
    queued: 'Queued',
    running: 'Running',
    processing: 'Processing',
    starting: 'Starting',
    pending: 'Pending',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    offline: 'Offline',
    promptLabel: 'Prompt',
    styleTemplateLabel: 'Style Template',
    sizeLabel: 'Size',
    resolutionLabel: 'Resolution',
    aspectRatioLabel: 'Aspect Ratio',
    stepsSeedLabel: 'Steps / Seed',
    countLabel: 'Count',
    noteLabel: 'Note',
    imageMissing: 'Image file missing.',
    savedGeneration: 'Saved Generation',
    reusePrompt: 'Reuse Prompt',
    saveAsStyle: 'Save as Style',
    cancelTask: 'Cancel Task',
    generationFailed: 'Generation failed: {message}',
    generationCancelled: 'Generation cancelled.',
    unableToReach: 'Unable to reach the local generator.',
    failedToStartGeneration: 'Failed to start generation',
    previewPrompt: 'Prompt',
    previewSize: 'Size',
    previewCount: 'Count',
    previewSteps: 'Steps',
    previewSeed: 'Seed',
    random: 'random',
    previewGuidance: 'Guidance',
    previewGaussian: 'Gaussian Blur'
  }
};

initializeTemplateStore();
refreshTemplates();
updateGlobalStatus();
startSystemPolling();
renderHistory();
applyLanguage();

gaussianInput.addEventListener('input', () => {
  gaussianValue.textContent = gaussianInput.value;
});

aspectRatioSelect.addEventListener('change', syncDimensionsFromRatio);
resolutionSelect.addEventListener('change', syncDimensionsFromRatio);
document.getElementById('widthInput').addEventListener('input', syncHeightFromWidth);
document.getElementById('heightInput').addEventListener('input', syncWidthFromHeight);

settingsToggle.addEventListener('click', () => {
  settingsDrawer.classList.add('open');
});

settingsClose.addEventListener('click', () => {
  settingsDrawer.classList.remove('open');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await startGeneration();
});

saveTemplateButton.addEventListener('click', saveTemplate);
updateTemplateButton.addEventListener('click', updateTemplate);
reuseTemplateButton.addEventListener('click', reuseSelectedTemplate);
deleteTemplateButton.addEventListener('click', deleteTemplate);
templateSelect.addEventListener('change', syncSelectedTemplateToForm);
lightboxClose.addEventListener('click', closeLightbox);
languageToggle.addEventListener('click', toggleLanguage);
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});

function t(key, vars = {}) {
  const dict = translations[currentLanguage] || translations.zh;
  const template = dict[key] ?? translations.zh[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  saveTemplateButton.title = t('saved');
  saveTemplateButton.setAttribute('aria-label', t('saved'));
  updateTemplateButton.title = currentLanguage === 'zh' ? '编辑模板' : 'Edit template';
  updateTemplateButton.setAttribute('aria-label', updateTemplateButton.title);
  reuseTemplateButton.title = currentLanguage === 'zh' ? '复用模板' : 'Reuse template';
  reuseTemplateButton.setAttribute('aria-label', reuseTemplateButton.title);
  deleteTemplateButton.title = currentLanguage === 'zh' ? '删除模板' : 'Delete template';
  deleteTemplateButton.setAttribute('aria-label', deleteTemplateButton.title);
  refreshTemplates();
  updateGlobalStatus();
  renderHistory();
  refreshLiveJobCardsLocale();
  if (!requestPreview.textContent.trim()) {
    requestPreview.innerHTML = `<p>${t('lastJobPlaceholder')}</p>`;
  }
}

function toggleLanguage() {
  currentLanguage = currentLanguage === 'zh' ? 'en' : 'zh';
  localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  applyLanguage();
}

function updateStatus(text) {
  statusLabel.textContent = text;
}

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();
  if (['completed', 'done', 'succeeded', 'success'].includes(value)) return 'completed';
  if (['failed', 'error'].includes(value)) return 'failed';
  if (['cancelled', 'canceled'].includes(value)) return 'cancelled';
  if (['running', 'processing', 'starting', 'queued', 'pending'].includes(value)) return value;
  return value || 'queued';
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function startDashboardTimer() {
  clearInterval(dashboardTimerHandle);
  dashboardTimerHandle = setInterval(() => {
    const activeJobs = [...jobs.values()].filter((job) => !job.finished);
    if (!activeJobs.length) {
      timerValue.textContent = '00:00';
      return;
    }
    const earliestStart = Math.min(...activeJobs.map((job) => job.startedAt));
    timerValue.textContent = formatDuration(Date.now() - earliestStart);
  }, 500);
}

function updateGlobalStatus() {
  const activeCount = [...jobs.values()].filter((job) => !job.finished).length;
  updateStatus(activeCount ? t('activeCount', { count: activeCount }) : t('idle'));
  if (!activeCount) {
    clearInterval(dashboardTimerHandle);
    dashboardTimerHandle = null;
    timerValue.textContent = '00:00';
  }
}

function getAspectRatioParts() {
  const value = aspectRatioSelect.value;
  if (!value || value === 'custom') return null;
  const [w, h] = value.split(':').map(Number);
  return { w, h };
}

function syncDimensionsFromRatio() {
  const ratio = getAspectRatioParts();
  const widthInput = document.getElementById('widthInput');
  const heightInput = document.getElementById('heightInput');
  const resolution = resolutionProfiles[resolutionSelect.value] || 2048;
  if (!ratio) {
    widthInput.removeAttribute('readonly');
    heightInput.removeAttribute('readonly');
    return;
  }
  widthInput.setAttribute('readonly', 'readonly');
  heightInput.setAttribute('readonly', 'readonly');
  if (ratio.w >= ratio.h) {
    widthInput.value = resolution;
    heightInput.value = Math.round((resolution * ratio.h) / ratio.w);
  } else {
    heightInput.value = resolution;
    widthInput.value = Math.round((resolution * ratio.w) / ratio.h);
  }
}

function syncHeightFromWidth() {
  const ratio = getAspectRatioParts();
  if (!ratio) return;
  const width = parseInt(document.getElementById('widthInput').value, 10) || 1024;
  document.getElementById('heightInput').value = Math.round((width * ratio.h) / ratio.w);
}

function syncWidthFromHeight() {
  const ratio = getAspectRatioParts();
  if (!ratio) return;
  const height = parseInt(document.getElementById('heightInput').value, 10) || 1024;
  document.getElementById('widthInput').value = Math.round((height * ratio.w) / ratio.h);
}

function getTemplates() {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
}

function initializeTemplateStore() {
  const existingTemplates = getTemplates();
  const existingNames = new Set(existingTemplates.map((template) => template.name));
  const missingDefaults = defaultTemplates
    .filter((template) => !existingNames.has(template.name))
    .map((template) => ({ id: crypto.randomUUID(), ...template }));

  if (!existingTemplates.length) {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(missingDefaults));
    return;
  }

  if (missingDefaults.length) {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify([...missingDefaults, ...existingTemplates]));
  }
}

function saveTemplates(templates) {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  refreshTemplates();
}

function refreshTemplates() {
  const selectedId = templateSelect.value;
  const templates = getTemplates();
  templateSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = templates.length ? t('chooseSavedTemplate') : t('noSavedTemplates');
  templateSelect.appendChild(placeholder);
  templates.forEach((template) => {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = template.name;
    templateSelect.appendChild(option);
  });
  if (selectedId && templates.some((template) => template.id === selectedId)) {
    templateSelect.value = selectedId;
  }
  templateCount.textContent = t('savedCount', { count: templates.length });
}

function syncSelectedTemplateToForm() {
  const selectedId = templateSelect.value;
  const template = getTemplates().find((item) => item.id === selectedId);
  if (!template) return;
  templateNameInput.value = template.name;
  promptTemplateInput.value = template.body;
  requestPreview.innerHTML = `<p><strong>${t('loaded')}</strong>: ${template.name}</p>`;
}

function saveTemplate() {
  const name = templateNameInput.value.trim();
  const body = promptTemplateInput.value.trim();
  if (!name || !body) {
    requestPreview.innerHTML = `<p class="error">${t('templateSaveRequired')}</p>`;
    return;
  }
  const templates = getTemplates();
  templates.push({ id: crypto.randomUUID(), name, body });
  saveTemplates(templates);
  requestPreview.innerHTML = `<p><strong>${t('saved')}</strong>: ${name}</p>`;
}

function updateTemplate() {
  const selectedId = templateSelect.value;
  if (!selectedId) {
    requestPreview.innerHTML = `<p class="error">${t('selectTemplateToEdit')}</p>`;
    return;
  }
  const name = templateNameInput.value.trim();
  const body = promptTemplateInput.value.trim();
  const templates = getTemplates().map((template) =>
    template.id === selectedId ? { ...template, name: name || template.name, body: body || template.body } : template
  );
  saveTemplates(templates);
  requestPreview.innerHTML = `<p><strong>${t('updated')}</strong>: ${name || templateNameInput.value || t('styleTemplate')}</p>`;
}

function deleteTemplate() {
  const selectedId = templateSelect.value;
  if (!selectedId) {
    requestPreview.innerHTML = `<p class="error">${t('selectTemplateToDelete')}</p>`;
    return;
  }
  const templates = getTemplates().filter((template) => template.id !== selectedId);
  saveTemplates(templates);
  templateSelect.value = '';
  requestPreview.innerHTML = `<p><strong>${t('deleted')}</strong>: ${t('deletedTemplate')}</p>`;
}

function reuseSelectedTemplate() {
  if (!templateSelect.value) {
    requestPreview.innerHTML = `<p class="error">${t('selectTemplateToReuse')}</p>`;
    return;
  }
  syncSelectedTemplateToForm();
  requestPreview.innerHTML = `<p><strong>${t('reused')}</strong>: ${templateNameInput.value}</p>`;
}

function createJobCard(payload, jobId) {
  const empty = resultStream.querySelector('.empty-state');
  if (empty) empty.remove();

  const card = document.createElement('article');
  card.className = 'job-card';
  card.dataset.jobId = jobId;
  card.innerHTML = `
    <div class="job-header">
      <div class="job-title">
        <p class="eyebrow">${t('taskLabel')} ${jobId}</p>
        <h3>${payload.promptTemplateName || t('adhocPromptTask')}</h3>
      </div>
      <div class="job-badges">
        <span class="job-status" data-status="queued">${t('queued')}</span>
        <span class="job-elapsed">00:00</span>
      </div>
    </div>
    <div class="job-progress">
      <div class="job-progress-bar"><div class="job-progress-fill"></div></div>
      <div class="job-progress-meta">
        <span class="job-progress-text">${t('queued')}</span>
        <span class="job-progress-value">0%</span>
      </div>
    </div>
    <div class="job-settings">
      <div class="job-setting"><strong>${t('promptLabel')}</strong><span>${payload.prompt}</span></div>
      <div class="job-setting"><strong>${t('styleTemplateLabel')}</strong><span>${payload.promptTemplate || '-'}</span></div>
      <div class="job-setting"><strong>${t('sizeLabel')}</strong><span>${payload.width}×${payload.height}</span></div>
      <div class="job-setting"><strong>${t('countLabel')}</strong><span>${payload.count}</span></div>
    </div>
    <div class="job-actions">
      <button type="button" class="secondary-button reuse-prompt-button">${t('reusePrompt')}</button>
      <button type="button" class="secondary-button save-task-template-button">${t('saveAsStyle')}</button>
      <button type="button" class="secondary-button cancel-job-button">${t('cancelTask')}</button>
    </div>
    <div class="job-images"></div>
  `;

  card.querySelector('.reuse-prompt-button').addEventListener('click', () => {
    document.getElementById('promptInput').value = payload.prompt;
    promptTemplateInput.value = payload.promptTemplate || '';
    templateNameInput.value = payload.promptTemplateName || '';
    requestPreview.innerHTML = `<p><strong>${t('reused')}</strong>: ${t('promptReused')}</p>`;
  });

  card.querySelector('.save-task-template-button').addEventListener('click', () => {
    if (!payload.promptTemplate) {
      requestPreview.innerHTML = `<p class="error">${t('noStyleTemplateToSave')}</p>`;
      return;
    }
    templateNameInput.value = payload.promptTemplateName || `Task ${jobId}`;
    promptTemplateInput.value = payload.promptTemplate;
    saveTemplate();
  });

  card.querySelector('.cancel-job-button').addEventListener('click', async () => {
    const resp = await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' });
    const data = await resp.json();
    requestPreview.innerHTML = `<p><strong>${t('cancel')}</strong>: ${data.message}</p>`;
  });

  resultStream.prepend(card);
  return card;
}

function createHistoryCard(entry) {
  const card = document.createElement('article');
  card.className = 'job-card history-card';
  const status = normalizeStatus(entry.status || 'completed');
  const imageMarkup = (entry.images || []).slice(0, parseInt(previewLimitInput.value, 10) || 4).map((src, index) => `
    <div class="job-image-card">
      <img src="${src}" alt="${entry.request?.prompt || 'History image'} ${index + 1}">
      <div class="job-image-tools">
        <button
          type="button"
          class="icon-tool-button preview-history-button"
          data-src="${src}"
          title="${t('previewImage')}"
          aria-label="${t('previewImage')}"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <a
          class="icon-tool-button"
          href="${src}"
          download="${src.split('/').pop()}"
          title="${t('downloadImage')}"
          aria-label="${t('downloadImage')}"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v11" />
            <path d="m8 10 4 4 4-4" />
            <path d="M4 18h16" />
          </svg>
        </a>
      </div>
    </div>
  `).join('');

  card.innerHTML = `
    <div class="job-header">
      <div class="job-title">
        <div class="history-chip">History</div>
        <h3>${entry.request?.promptTemplateName || t('savedGeneration')}</h3>
      </div>
      <div class="job-badges">
        <span class="job-status" data-status="${status}">${t(status)}</span>
        <span class="job-elapsed">${entry.generatedAtLabel || ''}</span>
      </div>
    </div>
    <div class="job-settings">
      <div class="job-setting"><strong>${t('promptLabel')}</strong><span>${entry.request?.prompt || ''}</span></div>
      <div class="job-setting"><strong>${t('styleTemplateLabel')}</strong><span>${entry.request?.promptTemplate || '-'}</span></div>
      <div class="job-setting"><strong>${t('sizeLabel')}</strong><span>${entry.request?.width}×${entry.request?.height}</span></div>
      <div class="job-setting"><strong>${t('resolutionLabel')}</strong><span>${entry.request?.resolution || 'n/a'}</span></div>
      <div class="job-setting"><strong>${t('aspectRatioLabel')}</strong><span>${entry.request?.aspectRatio || 'n/a'}</span></div>
      <div class="job-setting"><strong>${t('stepsSeedLabel')}</strong><span>${entry.request?.steps} / ${entry.request?.seed ?? t('random')}</span></div>
    </div>
    <div class="job-images">${imageMarkup || `<div class="job-note">${t('imageMissing')}</div>`}</div>
  `;

  card.querySelectorAll('.preview-history-button').forEach((button) => {
    button.addEventListener('click', () => openLightbox(button.dataset.src));
  });
  return card;
}

function renderHistory() {
  resultStream.querySelectorAll('.history-card').forEach((card) => card.remove());
  const history = getHistory();
  historyDivider.hidden = history.length === 0;
  if (!history.length) return;
  history.slice().reverse().forEach((entry) => {
    resultStream.appendChild(createHistoryCard(entry));
  });
}

function updateJobCard(job, payload) {
  const card = job.element;
  const elapsed = payload.elapsedMs || (Date.now() - job.startedAt);
  const progress = Math.max(0, Math.min(100, payload.progress || 0));
  const normalizedStatus = normalizeStatus(payload.status);
  const statusNode = card.querySelector('.job-status');
  statusNode.textContent = t(normalizedStatus);
  statusNode.dataset.status = normalizedStatus;
  card.querySelector('.job-elapsed').textContent = formatDuration(elapsed);
  card.querySelector('.job-progress-fill').style.width = `${progress}%`;
  card.querySelector('.job-progress-text').textContent = t(normalizedStatus);
  card.querySelector('.job-progress-value').textContent = `${progress}%`;

  if (payload.images?.length) {
    const imagesContainer = card.querySelector('.job-images');
    if (!imagesContainer.dataset.loaded) {
      imagesContainer.innerHTML = '';
      payload.images.slice(0, parseInt(previewLimitInput.value, 10) || 4).forEach((src, index) => {
        const imageCard = document.createElement('div');
        imageCard.className = 'job-image-card';
        const image = document.createElement('img');
        image.src = `${src}?t=${Date.now()}`;
        image.alt = `${payload.request?.prompt || 'Zimage result'} ${index + 1}`;
        imageCard.appendChild(image);
        const tools = document.createElement('div');
        tools.className = 'job-image-tools';
        const previewBtn = document.createElement('button');
        previewBtn.type = 'button';
        previewBtn.className = 'icon-tool-button';
        previewBtn.title = t('previewImage');
        previewBtn.setAttribute('aria-label', t('previewImage'));
        previewBtn.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        `;
        previewBtn.addEventListener('click', () => openLightbox(src));
        const downloadLink = document.createElement('a');
        downloadLink.className = 'icon-tool-button';
        downloadLink.title = t('downloadImage');
        downloadLink.setAttribute('aria-label', t('downloadImage'));
        downloadLink.href = src;
        downloadLink.download = src.split('/').pop();
        downloadLink.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v11" />
            <path d="m8 10 4 4 4-4" />
            <path d="M4 18h16" />
          </svg>
        `;
        tools.append(previewBtn, downloadLink);
        imageCard.appendChild(tools);
        imagesContainer.appendChild(imageCard);
      });
      imagesContainer.dataset.loaded = 'true';
    }
  }

  card.querySelectorAll('.job-note, .job-error').forEach((node) => node.remove());
  (payload.notes || []).forEach((note) => {
    const noteNode = document.createElement('div');
    noteNode.className = 'job-note';
    noteNode.textContent = note;
    card.appendChild(noteNode);
  });

  if (payload.error) {
    const errorNode = document.createElement('div');
    errorNode.className = 'job-error';
    errorNode.textContent = payload.error;
    card.appendChild(errorNode);
  }
}

function renderRequestPreview(payload) {
  if (!payload || !payload.prompt) {
    requestPreview.innerHTML = `<p>${t('lastJobPlaceholder')}</p>`;
    return;
  }

  const parts = [
    [t('previewPrompt'), payload.prompt],
    [t('previewSize'), `${payload.width}×${payload.height}`],
    [t('previewCount'), payload.count],
    [t('previewSteps'), payload.steps],
    [t('previewSeed'), payload.seed || t('random')],
    [t('previewGuidance'), payload.guidance],
    [t('previewGaussian'), payload.gaussian]
  ];
  const notes = (payload.notes || [])
    .map((note) => `<p class="error"><strong>${t('noteLabel')}</strong>: ${note}</p>`)
    .join('');
  requestPreview.innerHTML = parts
    .map(([key, value]) => `<p><strong>${key}</strong>: ${value}</p>`)
    .join('') + notes;
}

async function startGeneration() {
  const prompt = document.getElementById('promptInput').value.trim();
  const promptTemplate = promptTemplateInput.value.trim();
  const promptTemplateName = templateNameInput.value.trim();
  syncDimensionsFromRatio();
  const width = parseInt(document.getElementById('widthInput').value, 10) || 1024;
  const height = parseInt(document.getElementById('heightInput').value, 10) || 1024;
  const count = parseInt(document.getElementById('countInput').value, 10) || 1;
  const steps = parseInt(stepsInput.value, 10) || 9;
  const seed = parseInt(seedInput.value, 10) || undefined;
  const guidance = parseFloat(guidanceInput.value) || 7.5;
  const gaussian = parseFloat(gaussianInput.value) || 0.8;
  const resolution = resolutionSelect.value;

  const payload = {
    prompt,
    promptTemplate,
    promptTemplateName,
    width: Math.max(64, width),
    height: Math.max(64, height),
    count,
    resolution,
    aspectRatio: aspectRatioSelect.value,
    steps,
    seed,
    guidance,
    gaussian
  };

  renderRequestPreview(payload);

  try {
    const resp = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      throw new Error(t('failedToStartGeneration'));
    }

    const data = await resp.json();
    const element = createJobCard(payload, data.jobId);
    const job = {
      id: data.jobId,
      payload,
      element,
      startedAt: Date.now(),
      finished: false,
      pollHandle: null
    };
    jobs.set(data.jobId, job);
    updateGlobalStatus();
    startDashboardTimer();
    pollJob(job);
    job.pollHandle = setInterval(() => pollJob(job), 1500);
  } catch (error) {
    updateStatus(t('failed'));
    requestPreview.innerHTML = `<p class="error">${t('unableToReach')}</p>`;
  }
}

async function pollJob(job) {
  try {
    const resp = await fetch(`/api/jobs/${job.id}`);
    if (!resp.ok) throw new Error('Job polling failed');
    const payload = await resp.json();
    const normalizedStatus = (payload.status || '').toLowerCase();
    updateJobCard(job, payload);

    if (['completed', 'done', 'succeeded'].includes(normalizedStatus)) {
      clearInterval(job.pollHandle);
      job.finished = true;
      updateGlobalStatus();
      persistHistoryEntry(payload);
      renderRequestPreview({
        ...(payload.request || {}),
        notes: payload.notes || []
      });
      renderHistory();
    }

    if (normalizedStatus === 'failed') {
      clearInterval(job.pollHandle);
      job.finished = true;
      updateGlobalStatus();
      requestPreview.innerHTML = `<p class="error">${t('generationFailed', { message: payload.error || 'unknown' })}</p>`;
    }

    if (normalizedStatus === 'cancelled') {
      clearInterval(job.pollHandle);
      job.finished = true;
      updateGlobalStatus();
      requestPreview.innerHTML = `<p class="error">${t('generationCancelled')}</p>`;
    }
  } catch (error) {
    clearInterval(job.pollHandle);
    job.finished = true;
    updateGlobalStatus();
    updateJobCard(job, {
      status: 'offline',
      progress: 100,
      error: error.message,
      request: job.payload,
      notes: []
    });
    requestPreview.innerHTML = `<p class="error">${error.message}</p>`;
  }
}

function persistHistoryEntry(payload) {
  const history = getHistory();
  history.push({
    jobId: payload.jobId,
    status: payload.status,
    images: payload.images || [],
    generatedAt: payload.finishedAt || Date.now(),
    generatedAtLabel: new Date(payload.finishedAt || Date.now()).toLocaleString(),
    request: payload.request || {}
  });
  saveHistory(history);
}

function openLightbox(src) {
  lightboxImage.src = src;
  lightboxDownload.href = src;
  lightboxDownload.download = src.split('/').pop();
  lightbox.classList.add('open');
}

function closeLightbox() {
  lightbox.classList.remove('open');
}

async function pollSystem() {
  try {
    const resp = await fetch('/api/system');
    if (!resp.ok) return;
    const data = await resp.json();
    cpuUsage.textContent = `${data.cpuPercent}%`;
    memoryUsage.textContent = `${data.memoryPercent}%`;
    gpuUsage.textContent = `${data.gpuPercent}`;
  } catch {
    cpuUsage.textContent = 'N/A';
    memoryUsage.textContent = 'N/A';
    gpuUsage.textContent = 'N/A';
  }
}

function startSystemPolling() {
  pollSystem();
  clearInterval(systemTimerHandle);
  systemTimerHandle = setInterval(pollSystem, 3000);
}

function refreshLiveJobCardsLocale() {
  jobs.forEach((job) => {
    const card = job.element;
    if (!card) return;
    const eyebrow = card.querySelector('.job-title .eyebrow');
    const title = card.querySelector('.job-title h3');
    const settings = card.querySelectorAll('.job-setting strong');
    const actions = card.querySelectorAll('.job-actions .secondary-button');
    const progressText = card.querySelector('.job-progress-text');
    const statusNode = card.querySelector('.job-status');
    if (eyebrow) eyebrow.textContent = `${t('taskLabel')} ${job.id}`;
    if (title) title.textContent = job.payload.promptTemplateName || t('adhocPromptTask');
    if (settings[0]) settings[0].textContent = t('promptLabel');
    if (settings[1]) settings[1].textContent = t('styleTemplateLabel');
    if (settings[2]) settings[2].textContent = t('sizeLabel');
    if (settings[3]) settings[3].textContent = t('countLabel');
    if (actions[0]) actions[0].textContent = t('reusePrompt');
    if (actions[1]) actions[1].textContent = t('saveAsStyle');
    if (actions[2]) actions[2].textContent = t('cancelTask');
    if (statusNode) statusNode.textContent = t(statusNode.dataset.status || 'queued');
    if (progressText) progressText.textContent = t((statusNode?.dataset.status) || 'queued');
    card.querySelectorAll('.icon-tool-button').forEach((button) => {
      const isDownload = button.tagName === 'A';
      const label = isDownload ? t('downloadImage') : t('previewImage');
      button.title = label;
      button.setAttribute('aria-label', label);
    });
  });
}

syncDimensionsFromRatio();
