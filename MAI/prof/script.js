document.addEventListener('DOMContentLoaded', () => {
    const photoEdit = document.getElementById('profile-photo-edit');
    const photoInput = document.getElementById('profile-photo-input');
    const photoImg = document.getElementById('profile-photo');

    const cropModal = document.getElementById('crop-modal');
    const cropStage = document.getElementById('crop-stage');
    const cropImg = document.getElementById('crop-img');
    const cropZoom = document.getElementById('crop-zoom');
    const cropCancel = document.getElementById('crop-cancel');
    const cropSave = document.getElementById('crop-save');

    const STAGE_W = 292;
    const STAGE_H = 286;

    let cropState = {
        offsetX: 0,
        offsetY: 0,
        scale: 1,
        baseScale: 1,
        displayW: 0,
        displayH: 0,
        imgNaturalW: 0,
        imgNaturalH: 0,
        objectUrl: null
    };

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartOffsetX = 0;
    let dragStartOffsetY = 0;

    function applyCropTransform() {
        cropImg.style.transform =
            'translate(-50%, -50%) ' +
            'translate(' + cropState.offsetX + 'px, ' + cropState.offsetY + 'px) ' +
            'scale(' + cropState.scale + ')';
    }

    function updateDisplaySize() {
        cropState.displayW = cropState.imgNaturalW * cropState.baseScale;
        cropState.displayH = cropState.imgNaturalH * cropState.baseScale;
    }

    function clampOffsets() {
        const scaledW = cropState.displayW * cropState.scale;
        const scaledH = cropState.displayH * cropState.scale;

        const maxX = Math.max(0, (scaledW - STAGE_W) / 2);
        const maxY = Math.max(0, (scaledH - STAGE_H) / 2);

        cropState.offsetX = Math.max(-maxX, Math.min(maxX, cropState.offsetX));
        cropState.offsetY = Math.max(-maxY, Math.min(maxY, cropState.offsetY));
    }

    function resetCropState() {
        cropState.offsetX = 0;
        cropState.offsetY = 0;
        cropState.scale = 1;
        cropZoom.value = '1';
        applyCropTransform();
    }

    function computeBaseScale() {
        if (!cropState.imgNaturalW || !cropState.imgNaturalH) {
            cropState.baseScale = 1;
            return;
        }
        const scaleX = STAGE_W / cropState.imgNaturalW;
        const scaleY = STAGE_H / cropState.imgNaturalH;
        cropState.baseScale = Math.min(scaleX, scaleY);
    }

    function fitImageElement() {
        const w = cropState.imgNaturalW * cropState.baseScale;
        const h = cropState.imgNaturalH * cropState.baseScale;
        cropImg.style.width = w + 'px';
        cropImg.style.height = h + 'px';
    }

    function openCrop(file) {
        if (cropState.objectUrl) {
            URL.revokeObjectURL(cropState.objectUrl);
            cropState.objectUrl = null;
        }

        const url = URL.createObjectURL(file);
        cropState.objectUrl = url;

        cropImg.onload = () => {
            cropState.imgNaturalW = cropImg.naturalWidth;
            cropState.imgNaturalH = cropImg.naturalHeight;
            computeBaseScale();
            updateDisplaySize();
            fitImageElement();
            resetCropState();
            cropModal.classList.add('is-visible');
        };

        cropImg.src = url;
    }

    function closeCrop() {
        cropModal.classList.remove('is-visible');
    }

    function renderFinalImage() {
        const canvas = document.createElement('canvas');
        canvas.width = STAGE_W;
        canvas.height = STAGE_H;
        const ctx = canvas.getContext('2d');

        ctx.save();

        ctx.beginPath();
        const r = 148;
        const w = STAGE_W;
        const h = STAGE_H;

        ctx.moveTo(r, 0);
        ctx.lineTo(w - r, 0);
        ctx.quadraticCurveTo(w, 0, w, r);
        ctx.lineTo(w, h - r);
        ctx.quadraticCurveTo(w, h, w - r, h);
        ctx.lineTo(r, h);
        ctx.quadraticCurveTo(0, h, 0, h - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.clip();

        const scaledW = cropState.displayW * cropState.scale;
        const scaledH = cropState.displayH * cropState.scale;
        const drawX = (STAGE_W - scaledW) / 2 + cropState.offsetX;
        const drawY = (STAGE_H - scaledH) / 2 + cropState.offsetY;

        ctx.drawImage(cropImg, drawX, drawY, scaledW, scaledH);

        ctx.restore();

        return canvas.toDataURL('image/png');
    }

    if (photoEdit && photoInput && photoImg && cropModal && cropStage && cropImg && cropZoom && cropCancel && cropSave) {
        photoEdit.addEventListener('click', () => {
            photoInput.value = '';
            photoInput.click();
        });

        photoInput.addEventListener('change', () => {
            const file = photoInput.files && photoInput.files[0];
            if (!file) return;
            openCrop(file);
        });

        cropZoom.addEventListener('input', () => {
            cropState.scale = parseFloat(cropZoom.value);
            clampOffsets();
            applyCropTransform();
        });

        cropStage.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            dragStartOffsetX = cropState.offsetX;
            dragStartOffsetY = cropState.offsetY;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            cropState.offsetX = dragStartOffsetX + dx;
            cropState.offsetY = dragStartOffsetY + dy;
            clampOffsets();
            applyCropTransform();
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        cropStage.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = -e.deltaY * 0.001;
            let next = cropState.scale + delta;
            next = Math.max(1, Math.min(3, next));
            cropState.scale = next;
            cropZoom.value = String(next);
            clampOffsets();
            applyCropTransform();
        }, { passive: false });

        cropCancel.addEventListener('click', () => {
            closeCrop();
        });

        cropSave.addEventListener('click', () => {
            const dataUrl = renderFinalImage();

            const oldSrc = photoImg.src;
            if (oldSrc && oldSrc.startsWith('blob:')) {
                URL.revokeObjectURL(oldSrc);
            }

            photoImg.src = dataUrl;
            closeCrop();
        });

        cropModal.addEventListener('click', (e) => {
            if (e.target === cropModal) {
                closeCrop();
            }
        });
    }

    document.querySelectorAll('.block').forEach(block => {
        const scroll = block.querySelector('[data-block-scroll]');
        const slider = block.querySelector('[data-block-slider]');
        const thumb = block.querySelector('[data-block-thumb]');
        if (!scroll || !slider || !thumb) return;

        const THUMB_W = 188;

        function onScroll() {
            const maxScroll = scroll.scrollWidth - scroll.clientWidth;
            if (maxScroll <= 0) {
                thumb.style.left = '0px';
                return;
            }
            const progress = scroll.scrollLeft / maxScroll;
            const maxLeft = slider.clientWidth - THUMB_W;
            thumb.style.left = (progress * maxLeft) + 'px';
        }

        slider.addEventListener('click', (e) => {
            if (e.target === thumb) return;
            const rect = slider.getBoundingClientRect();
            const clickX = e.clientX - rect.left - THUMB_W / 2;
            const maxLeft = slider.clientWidth - THUMB_W;
            const ratio = Math.max(0, Math.min(clickX / maxLeft, 1));
            scroll.scrollLeft = ratio * (scroll.scrollWidth - scroll.clientWidth);
        });

        let isDragging = false;
        let startX = 0;
        let startLeft = 0;

        thumb.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startLeft = thumb.offsetLeft;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - startX;
            const maxLeft = slider.clientWidth - THUMB_W;
            let newLeft = startLeft + deltaX;
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            thumb.style.left = newLeft + 'px';
            const ratio = maxLeft === 0 ? 0 : newLeft / maxLeft;
            scroll.scrollLeft = ratio * (scroll.scrollWidth - scroll.clientWidth);
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        scroll.addEventListener('scroll', onScroll);
        window.addEventListener('resize', onScroll);

        onScroll();
    });

    document.querySelectorAll('[data-rate]').forEach(card => {
        const stars = card.querySelectorAll('.rate__star');
        const starsWrap = card.querySelector('[data-rate-stars]');
        if (!stars.length || !starsWrap) return;

        let current = 0;

        function paint(value) {
            stars.forEach((s, i) => {
                s.classList.toggle('is-active', i < value);
            });
        }

        stars.forEach(star => {
            star.addEventListener('click', () => {
                current = parseInt(star.dataset.value, 10);
                paint(current);
            });

            star.addEventListener('mouseenter', () => {
                const v = parseInt(star.dataset.value, 10);
                stars.forEach((s, i) => {
                    s.classList.toggle('is-hover', i < v && i >= current);
                });
            });
        });

        starsWrap.addEventListener('mouseleave', () => {
            stars.forEach(s => s.classList.remove('is-hover'));
        });

        paint(0);
    });
});