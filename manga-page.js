document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const mangaImageInput = document.getElementById('manga-image-input');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    const mangaResults = document.getElementById('manga-results');
    const ocrBatchBtn = document.getElementById('ocr-batch-btn');
    const translateBatchBtn = document.getElementById('translate-batch-btn');
    const batchProgress = document.getElementById('batch-progress');
    const batchCurrent = document.getElementById('batch-current');
    const batchTotal = document.getElementById('batch-total');
    const batchProgressFill = document.getElementById('batch-progress-fill');
    const summarySection = document.getElementById('summary-section');
    const summaryOcrAll = document.getElementById('summary-ocr-all');
    const summaryTranslationAll = document.getElementById('summary-translation-all');
    const loadingIndicator = document.getElementById('loading-indicator');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressStatus = document.getElementById('progress-status');
    const mangaTypeSelect = document.getElementById('manga-type-select');
    const googleApiKeyInput = document.getElementById('google-api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const toggleApiKeyBtn = document.getElementById('toggle-api-key-btn');

    // Variables
    let uploadedImages = [];
    window.uploadedImages = uploadedImages; // Expose to global scope for analytics
    let isProcessing = false;
    let savedApiKey = '';
    let currentBatchOperation = null;
    
    // Constants
    const MAX_IMAGES = 30;
    const API_DELAY = 3000; // 3 seconds delay between API calls

    // Kiểm tra lấy API key từ localStorage khi trang được tải
    function loadSavedApiKey() {
        try {
            // Kiểm tra trong translationAppSettings của localStorage trước
            const translationSettings = localStorage.getItem('translationAppSettings');
            if (translationSettings) {
                const settings = JSON.parse(translationSettings);
                if (settings && settings.googleApiKey) {
                    googleApiKeyInput.value = settings.googleApiKey;
                    savedApiKey = settings.googleApiKey;
                    
                    // Hiển thị thông báo nhỏ khi tải xong trang và có API key
                    setTimeout(() => {
                        showToast('Đã tìm thấy API key đã lưu!', 'info');
                    }, 1000);
                    return;
                }
            }
            
            // Nếu không tìm thấy trong translationAppSettings, thử lấy từ key riêng
            const apiKey = localStorage.getItem('google-api-key');
            if (apiKey) {
                googleApiKeyInput.value = apiKey;
                savedApiKey = apiKey;
                
                // Hiển thị thông báo nhỏ khi tải xong trang và có API key
                setTimeout(() => {
                    showToast('Đã tìm thấy API key đã lưu!', 'info');
                }, 1000);
            } else {
                // Nếu không tìm thấy API key nào, hiển thị thông báo
                setTimeout(() => {
                    showToast('Vui lòng nhập Google AI Studio API key!', 'info');
                }, 1000);
            }
        } catch (e) {
            console.error('Lỗi khi đọc API key từ localStorage:', e);
        }
    }
    
    // Tải API key khi trang được khởi tạo
    loadSavedApiKey();
    
    // Xử lý sự kiện lưu API key
    saveApiKeyBtn.addEventListener('click', function() {
        const apiKey = googleApiKeyInput.value.trim();
        if (!apiKey) {
            showToast('Vui lòng nhập API key!', 'error');
            return;
        }
        
        try {
            // Lưu vào cả hai nơi để đảm bảo tương thích
            localStorage.setItem('google-api-key', apiKey);
            
            // Nếu đã có translationAppSettings thì cập nhật, nếu không thì tạo mới
            let settings = {};
            const translationSettings = localStorage.getItem('translationAppSettings');
            if (translationSettings) {
                settings = JSON.parse(translationSettings);
            }
            settings.googleApiKey = apiKey;
            localStorage.setItem('translationAppSettings', JSON.stringify(settings));
            
            savedApiKey = apiKey;
            showToast('Đã lưu API key thành công!', 'success');
        } catch (e) {
            console.error('Lỗi khi lưu API key:', e);
            showToast('Lỗi khi lưu API key!', 'error');
        }
    });
    
    // Xử lý sự kiện hiển thị/ẩn API key
    toggleApiKeyBtn.addEventListener('click', function() {
        if (googleApiKeyInput.type === 'password') {
            googleApiKeyInput.type = 'text';
            toggleApiKeyBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            googleApiKeyInput.type = 'password';
            toggleApiKeyBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });

    // Hàm hiển thị thông báo đẹp
    function showToast(message, type = 'success') {
        let background = '#28a745';
        if (type === 'error') background = '#dc3545';
        if (type === 'warning') background = '#ffc107';
        if (type === 'info') background = '#17a2b8';
        
        // Kiểm tra xem có phải trên thiết bị di động không
        const isMobile = window.innerWidth < 769;
        
        // Position và duration tùy theo thiết bị
        const position = isMobile ? 'center' : 'right';
        const duration = isMobile ? 3000 : 2000; // Hiển thị lâu hơn trên điện thoại
        
        Toastify({
            text: message,
            duration: duration,
            close: true,
            gravity: "bottom",
            position: position,
            backgroundColor: background,
            stopOnFocus: true
        }).showToast();
    }

    // Cập nhật thanh tiến trình
    function updateProgress(percent, statusText) {
        if (progressContainer.style.display === 'none' || !progressContainer.style.display) {
            progressContainer.style.display = 'block';
        }
        
        progressBar.style.width = percent + '%';
        progressStatus.textContent = statusText;
        
        // Đảm bảo tiến trình biến mất sau khi hoàn thành
        if (percent >= 100) {
            setTimeout(() => {
                progressContainer.style.display = 'none';
                // Reset lại width để lần sau sử dụng lại
                progressBar.style.width = '0%';
            }, 1500);
        }
    }

    // Hàm tạo manga item
    function createMangaItem(imageData, index) {
        const item = document.createElement('div');
        item.className = 'manga-item';
        item.dataset.index = index;
        
        item.innerHTML = `
            <div class="manga-item-header">
                <div class="manga-item-title">
                    <i class="fas fa-image"></i>
                    <span>Ảnh ${index + 1}: ${imageData.file.name}</span>
                    <small>(${Math.round(imageData.file.size/1024)} KB)</small>
                </div>
                <div class="manga-item-actions">
                    <button class="single-ocr-btn" onclick="processSingleOCR(${index})" title="OCR ảnh này">
                        <i class="fas fa-eye"></i> OCR
                    </button>
                    <button class="single-translate-btn" onclick="processSingleTranslate(${index})" title="Dịch ảnh này">
                        <i class="fas fa-language"></i> Dịch
                    </button>
                    <div class="manga-item-status">
                        <i class="fas fa-clock"></i>
                    </div>
                </div>
            </div>
            <div class="manga-item-content">
                <div class="manga-image-section">
                    <img src="${imageData.dataUrl}" alt="Ảnh ${index + 1}">
                </div>
                <div class="manga-text-section">
                    <div class="text-column">
                        <div class="text-column-header">
                            <div class="text-column-title">
                                <i class="fas fa-eye"></i> Văn bản OCR
                            </div>
                            <div class="text-column-actions">
                                <button class="copy-btn" onclick="copyText('ocr-${index}')">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                        <div id="ocr-${index}" class="text-content empty">Chưa thực hiện OCR</div>
                    </div>
                    <div class="text-column">
                        <div class="text-column-header">
                            <div class="text-column-title">
                                <i class="fas fa-language"></i> Bản dịch tiếng Việt
                            </div>
                            <div class="text-column-actions">
                                <button class="copy-btn" onclick="copyText('translation-${index}')">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                        <div id="translation-${index}" class="text-content empty">Chưa thực hiện dịch</div>
                    </div>
                </div>
            </div>
        `;
        
        return item;
    }
    
    // Hàm cập nhật trạng thái manga item
    function updateMangaItemStatus(index, status, progress = 0) {
        const item = mangaResults.querySelector(`[data-index="${index}"]`);
        if (!item) return;
        
        const statusIcon = item.querySelector('.manga-item-status i');
        
        // Xóa các class cũ
        item.classList.remove('processing', 'completed', 'error');
        
        switch (status) {
            case 'processing':
                item.classList.add('processing');
                statusIcon.className = 'fas fa-spinner fa-spin';
                break;
            case 'completed':
                item.classList.add('completed');
                statusIcon.className = 'fas fa-check';
                break;
            case 'error':
                item.classList.add('error');
                statusIcon.className = 'fas fa-times';
                break;
        }
    }
    
    // Hàm copy text global
    window.copyText = function(elementId) {
        const element = document.getElementById(elementId);
        if (element && element.textContent.trim()) {
            navigator.clipboard.writeText(element.textContent)
                .then(() => showToast('Đã sao chép!', 'success'))
                .catch(err => showToast('Lỗi khi sao chép: ' + err.message, 'error'));
        }
    }

    // Hàm cập nhật summary
    function updateSummary() {
        let allOcr = '';
        let allTranslation = '';
        let hasOcr = false;
        let hasTranslation = false;

        uploadedImages.forEach((imageData, index) => {
            const ocrElement = document.getElementById(`ocr-${index}`);
            const translationElement = document.getElementById(`translation-${index}`);
            
            if (ocrElement && ocrElement.textContent && !ocrElement.classList.contains('empty')) {
                if (allOcr) allOcr += '\n\n';
                allOcr += `=== Ảnh ${index + 1}: ${imageData.file.name} ===\n`;
                allOcr += ocrElement.textContent.trim();
                hasOcr = true;
            }
            
            if (translationElement && translationElement.textContent && !translationElement.classList.contains('empty')) {
                if (allTranslation) allTranslation += '\n\n';
                allTranslation += `=== Ảnh ${index + 1}: ${imageData.file.name} ===\n`;
                allTranslation += translationElement.textContent.trim();
                hasTranslation = true;
            }
        });

        // Cập nhật nội dung summary
        if (hasOcr) {
            summaryOcrAll.textContent = allOcr;
            summaryOcrAll.classList.remove('empty');
        } else {
            summaryOcrAll.textContent = 'Chưa có kết quả OCR';
            summaryOcrAll.classList.add('empty');
        }

        if (hasTranslation) {
            summaryTranslationAll.textContent = allTranslation;
            summaryTranslationAll.classList.remove('empty');
        } else {
            summaryTranslationAll.textContent = 'Chưa có bản dịch';
            summaryTranslationAll.classList.add('empty');
        }

        // Hiển thị summary section nếu có kết quả
        if (hasOcr || hasTranslation) {
            summarySection.style.display = 'block';
        }
    }

    // Hàm xử lý OCR riêng cho từng ảnh
    window.processSingleOCR = async function(index) {
        if (isProcessing) {
            showToast('Đang xử lý, vui lòng đợi!', 'warning');
            return;
        }
        
        const apiKey = getGoogleAPIKey();
        if (!apiKey) return;
        
        const imageData = uploadedImages[index];
        if (!imageData) {
            showToast('Không tìm thấy ảnh!', 'error');
            return;
        }
        
        const mangaType = mangaTypeSelect.value;
        
        try {
            // Set processing state
            isProcessing = true;
            currentBatchOperation = 'single-ocr';
            
            // Disable button và update status
            const item = mangaResults.querySelector(`[data-index="${index}"]`);
            const ocrBtn = item?.querySelector('.single-ocr-btn');
            if (ocrBtn) {
                ocrBtn.disabled = true;
                ocrBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> OCR...';
            }
            
            // Disable batch buttons
            ocrBatchBtn.disabled = true;
            translateBatchBtn.disabled = true;
            
            updateMangaItemStatus(index, 'processing');
            updateProgress(10, `Đang OCR ảnh ${index + 1}...`);
            
            // Thực hiện OCR
            const ocrText = await directOCR(imageData.dataUrl, apiKey, mangaType, index);
            
            if (ocrText) {
                imageData.ocrResult = ocrText;
                imageData.status = 'ocr-completed';
                
                // Hiển thị kết quả
                const ocrElement = document.getElementById(`ocr-${index}`);
                if (ocrElement) {
                    ocrElement.textContent = ocrText;
                    ocrElement.classList.remove('empty', 'error');
                }
                
                updateMangaItemStatus(index, 'completed');
                updateSummary();
                updateProgress(100, `OCR ảnh ${index + 1} hoàn thành!`);
                showToast(`OCR ảnh ${index + 1} thành công!`, 'success');
            } else {
                throw new Error('OCR không trả về kết quả');
            }
        } catch (error) {
            console.error(`Single OCR error for image ${index + 1}:`, error);
            
            const ocrElement = document.getElementById(`ocr-${index}`);
            if (ocrElement) {
                ocrElement.textContent = `❌ LỖI: ${error.message}`;
                ocrElement.classList.add('error');
                ocrElement.classList.remove('empty');
            }
            
            updateMangaItemStatus(index, 'error');
            updateProgress(100, `Lỗi OCR ảnh ${index + 1}!`);
            showToast(`Lỗi OCR ảnh ${index + 1}: ${error.message}`, 'error');
        } finally {
            // Reset processing state
            isProcessing = false;
            currentBatchOperation = null;
            
            // Re-enable button
            const item = mangaResults.querySelector(`[data-index="${index}"]`);
            const ocrBtn = item?.querySelector('.single-ocr-btn');
            if (ocrBtn) {
                ocrBtn.disabled = false;
                ocrBtn.innerHTML = '<i class="fas fa-eye"></i> OCR';
            }
            
            // Re-enable batch buttons
            ocrBatchBtn.disabled = false;
            translateBatchBtn.disabled = false;
            
            // Hide progress after delay
            setTimeout(() => {
                progressContainer.style.display = 'none';
                progressBar.style.width = '0%';
            }, 1500);
        }
    };

    // Hàm xử lý dịch riêng cho từng ảnh
    window.processSingleTranslate = async function(index) {
        if (isProcessing) {
            showToast('Đang xử lý, vui lòng đợi!', 'warning');
            return;
        }
        
        const imageData = uploadedImages[index];
        if (!imageData || !imageData.ocrResult) {
            showToast('Vui lòng thực hiện OCR trước!', 'warning');
            return;
        }
        
        const apiKey = getGoogleAPIKey();
        if (!apiKey) return;
        
        const mangaType = mangaTypeSelect.value;
        
        try {
            // Set processing state
            isProcessing = true;
            currentBatchOperation = 'single-translate';
            
            // Disable button và update status
            const item = mangaResults.querySelector(`[data-index="${index}"]`);
            const translateBtn = item?.querySelector('.single-translate-btn');
            if (translateBtn) {
                translateBtn.disabled = true;
                translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Dịch...';
            }
            
            // Disable batch buttons
            ocrBatchBtn.disabled = true;
            translateBatchBtn.disabled = true;
            
            updateMangaItemStatus(index, 'processing');
            updateProgress(10, `Đang dịch ảnh ${index + 1}...`);
            
            // Thực hiện dịch
            const translatedText = await directTranslate(imageData.ocrResult, apiKey, mangaType, imageData.dataUrl);
            
            if (translatedText) {
                imageData.translationResult = translatedText;
                imageData.status = 'completed';
                
                // Hiển thị kết quả
                const translationElement = document.getElementById(`translation-${index}`);
                if (translationElement) {
                    translationElement.textContent = translatedText;
                    translationElement.classList.remove('empty', 'error');
                }
                
                updateMangaItemStatus(index, 'completed');
                updateSummary();
                updateProgress(100, `Dịch ảnh ${index + 1} hoàn thành!`);
                showToast(`Dịch ảnh ${index + 1} thành công!`, 'success');
            } else {
                throw new Error('Dịch không trả về kết quả');
            }
        } catch (error) {
            console.error(`Single translation error for image ${index + 1}:`, error);
            
            const translationElement = document.getElementById(`translation-${index}`);
            if (translationElement) {
                translationElement.textContent = `❌ LỖI: ${error.message}`;
                translationElement.classList.add('error');
                translationElement.classList.remove('empty');
            }
            
            updateMangaItemStatus(index, 'error');
            updateProgress(100, `Lỗi dịch ảnh ${index + 1}!`);
            showToast(`Lỗi dịch ảnh ${index + 1}: ${error.message}`, 'error');
        } finally {
            // Reset processing state
            isProcessing = false;
            currentBatchOperation = null;
            
            // Re-enable button
            const item = mangaResults.querySelector(`[data-index="${index}"]`);
            const translateBtn = item?.querySelector('.single-translate-btn');
            if (translateBtn) {
                translateBtn.disabled = false;
                translateBtn.innerHTML = '<i class="fas fa-language"></i> Dịch';
            }
            
            // Re-enable batch buttons
            ocrBatchBtn.disabled = false;
            translateBatchBtn.disabled = false;
            
            // Hide progress after delay
            setTimeout(() => {
                progressContainer.style.display = 'none';
                progressBar.style.width = '0%';
            }, 1500);
        }
    };
    
    // Xử lý upload nhiều ảnh
    mangaImageInput.addEventListener('change', function(event) {
        const files = Array.from(event.target.files);
        
        if (files.length === 0) return;
        
        // Kiểm tra giới hạn số lượng ảnh
        if (files.length > MAX_IMAGES) {
            showToast(`Chỉ có thể tải tối đa ${MAX_IMAGES} ảnh!`, 'error');
            return;
        }
        
        // Kiểm tra định dạng file
        const invalidFiles = files.filter(file => !file.type.match('image.*'));
        if (invalidFiles.length > 0) {
            showToast('Vui lòng chỉ chọn file ảnh!', 'error');
            return;
        }
        
        // Sắp xếp files theo tên để đảm bảo thứ tự đúng
        files.sort((a, b) => a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: 'base'
        }));
        
        // Thông báo đến Discord
        if (window.analytics) {
            window.analytics.trackAction('Upload Manga Batch', `Người dùng tải lên ${files.length} ảnh trang truyện`);
        }
        
        // Reset dữ liệu cũ
        uploadedImages = [];
        window.uploadedImages = uploadedImages; // Sync with global
        mangaResults.innerHTML = '';
        summarySection.style.display = 'none';
        
        updateProgress(10, `Đang đọc ${files.length} file ảnh...`);
        
        // Ẩn placeholder
        previewPlaceholder.style.display = 'none';
        
        // Xử lý từng file và sắp xếp theo thứ tự
        let processedCount = 0;
        const tempImages = [];
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imageData = {
                dataUrl: e.target.result,
                    file: file,
                    ocrResult: '',
                    translationResult: '',
                    status: 'pending',
                    originalIndex: index
                };
                
                tempImages[index] = imageData;
                processedCount++;
                
                const progress = Math.round((processedCount / files.length) * 100);
                updateProgress(progress, `Đã tải ${processedCount}/${files.length} ảnh`);
                
                if (processedCount === files.length) {
                    // Sắp xếp lại theo thứ tự index để đảm bảo thứ tự đúng
                    uploadedImages = tempImages.filter(img => img !== undefined);
                    window.uploadedImages = uploadedImages; // Sync with global
                    
                    // Tạo manga items theo thứ tự đã sắp xếp
                    uploadedImages.forEach((imageData, finalIndex) => {
                        // Cập nhật index cuối cùng
                        imageData.finalIndex = finalIndex;
                        const mangaItem = createMangaItem(imageData, finalIndex);
                        mangaResults.appendChild(mangaItem);
                    });
                    
                    setTimeout(() => {
                        updateProgress(100, 'Tải ảnh thành công!');
                        showToast(`Đã tải ${files.length} ảnh thành công!`, 'success');
                        
                        // Enable batch buttons
                        ocrBatchBtn.disabled = false;
                    }, 200);
                }
        };
        
        reader.readAsDataURL(file);
        });
    });

    // Hàm scroll đến phần tử
    function scrollToElement(element) {
        if (element) {
            // Nếu đang ở màn hình di động, cuộn đến phần tử
            if (window.innerWidth <= 1100) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }

    // Hàm lấy API Key từ input hoặc localStorage
    function getGoogleAPIKey() {
        // Ưu tiên sử dụng API key từ ô input nếu có
        let apiKey = googleApiKeyInput.value.trim();
        
        // Nếu không có giá trị trong input, kiểm tra savedApiKey đã lưu trong biến
        if (!apiKey && savedApiKey) {
            apiKey = savedApiKey;
            // Cập nhật lại ô input
            googleApiKeyInput.value = savedApiKey;
        }
        
        // Nếu vẫn không có, kiểm tra trong localStorage
        if (!apiKey) {
            try {
                // Kiểm tra trong translationAppSettings trước
                const translationSettings = localStorage.getItem('translationAppSettings');
                if (translationSettings) {
                    const settings = JSON.parse(translationSettings);
                    if (settings && settings.googleApiKey) {
                        apiKey = settings.googleApiKey;
                        googleApiKeyInput.value = apiKey;
                        savedApiKey = apiKey;
                    }
                }
                
                // Nếu không có trong translationAppSettings, thử lấy từ key riêng
                if (!apiKey) {
                    apiKey = localStorage.getItem('google-api-key');
                    if (apiKey) {
                        googleApiKeyInput.value = apiKey;
                        savedApiKey = apiKey;
                    }
                }
            } catch (e) {
                console.error('Lỗi khi đọc API key từ localStorage:', e);
            }
        }
        
        // Nếu vẫn không có, thông báo lỗi
        if (!apiKey) {
            showToast('Vui lòng nhập Google AI Studio API key!', 'error');
            googleApiKeyInput.focus();
            return null;
        }
        
        return apiKey;
    }

    // Hàm delay
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Hàm cập nhật batch progress
    function updateBatchProgress(current, total) {
        batchCurrent.textContent = current;
        batchTotal.textContent = total;
        const percentage = total > 0 ? (current / total) * 100 : 0;
        batchProgressFill.style.width = percentage + '%';
        
        if (current === total && total > 0) {
            setTimeout(() => {
                batchProgress.style.display = 'none';
            }, 2000);
        }
    }
    
    // Hàm xử lý batch OCR
    async function processBatchOCR() {
        if (isProcessing || uploadedImages.length === 0) return;
        
        const apiKey = getGoogleAPIKey();
        if (!apiKey) return;
        
        const mangaType = mangaTypeSelect.value;
        
            isProcessing = true;
        currentBatchOperation = 'ocr';
        
        // Hiển thị progress
        batchProgress.style.display = 'block';
            loadingIndicator.style.display = 'flex';
        
        // Disable buttons
        ocrBatchBtn.disabled = true;
        translateBatchBtn.disabled = true;

        
        let completedCount = 0;
        
        try {
            for (let i = 0; i < uploadedImages.length; i++) {
                const imageData = uploadedImages[i];
                
                updateMangaItemStatus(i, 'processing');
                updateBatchProgress(completedCount, uploadedImages.length);
                
                try {
                    // Thực hiện OCR cho ảnh hiện tại
                    const ocrText = await directOCR(imageData.dataUrl, apiKey, mangaType, i);
                    
                    if (ocrText) {
                        uploadedImages[i].ocrResult = ocrText;
                        uploadedImages[i].status = 'ocr-completed';
                        
                        // Hiển thị kết quả OCR trong result card riêng
                        const ocrElement = document.getElementById(`ocr-${i}`);
                        if (ocrElement) {
                            ocrElement.textContent = ocrText;
                            ocrElement.classList.remove('empty', 'error');
                        }
                        
                        updateMangaItemStatus(i, 'completed');
                        
                        // Cập nhật summary
                        updateSummary();
                    } else {
                        throw new Error('OCR không trả về kết quả');
                    }
        } catch (error) {
                    console.error(`OCR error for image ${i + 1}:`, error);
                    uploadedImages[i].status = 'error';
                    uploadedImages[i].ocrResult = `Lỗi OCR: ${error.message}`;
                    
                    // Hiển thị lỗi trong result card
                    const ocrElement = document.getElementById(`ocr-${i}`);
                    if (ocrElement) {
                        ocrElement.textContent = `❌ LỖI: ${error.message}`;
                        ocrElement.classList.remove('empty');
                        ocrElement.classList.add('error');
                    }
                    
                    updateMangaItemStatus(i, 'error');
                }
                
                completedCount++;
                updateBatchProgress(completedCount, uploadedImages.length);
                
                // Delay giữa các request để tránh rate limit
                if (i < uploadedImages.length - 1) {
                    await sleep(API_DELAY);
                }
            }
            
            showToast(`Hoàn thành OCR ${completedCount} ảnh!`, 'success');
            translateBatchBtn.disabled = false;
            
            // Gửi thông báo hoàn thành OCR batch đến Discord webhook
            if (window.analytics) {
                window.analytics.ensureIpThenSend({
                    embeds: [{
                        title: '✅ Hoàn thành OCR batch',
                        fields: [
                            {
                                name: 'Session ID',
                                value: window.analytics.sessionId || 'Không xác định'
                            },
                            {
                                name: 'IP',
                                value: window.analytics.userIp || 'Không xác định'
                            },
                            {
                                name: 'Số lượng ảnh đã OCR',
                                value: `${completedCount}/${uploadedImages.length} trang`
                            },
                            {
                                name: 'Tổng ký tự OCR',
                                value: `${uploadedImages.reduce((total, img) => total + (img.ocrResult?.length || 0), 0)} ký tự`
                            },
                            {
                                name: 'Thời gian',
                                value: new Date().toLocaleString('vi-VN')
                            }
                        ],
                        color: 0x28a745
                    }]
                });
            }
            
        } catch (error) {
            console.error('Batch OCR error:', error);
            showToast(`Lỗi batch OCR: ${error.message}`, 'error');
        } finally {
            isProcessing = false;
            currentBatchOperation = null;
            loadingIndicator.style.display = 'none';
            ocrBatchBtn.disabled = false;

        }
    }
    
    // Hàm xử lý batch translation
    async function processBatchTranslation() {
        if (isProcessing || uploadedImages.length === 0) return;
        
        // Kiểm tra có kết quả OCR không
        const hasOcrResults = uploadedImages.some(img => img.ocrResult && img.ocrResult.trim());
        if (!hasOcrResults) {
            showToast('Vui lòng thực hiện OCR trước!', 'error');
            return;
        }
        
        const apiKey = getGoogleAPIKey();
        if (!apiKey) return;
        
        const mangaType = mangaTypeSelect.value;
        
            isProcessing = true;
        currentBatchOperation = 'translation';
        
        // Hiển thị progress
        batchProgress.style.display = 'block';
            loadingIndicator.style.display = 'flex';
        
        // Disable buttons
        ocrBatchBtn.disabled = true;
        translateBatchBtn.disabled = true;

        
                let completedCount = 0;
        
        try {
            for (let i = 0; i < uploadedImages.length; i++) {
                const imageData = uploadedImages[i];
                
                if (!imageData.ocrResult || !imageData.ocrResult.trim()) {
                    // Hiển thị thông báo chưa có OCR
                    const translationElement = document.getElementById(`translation-${i}`);
                    if (translationElement) {
                        translationElement.textContent = '❌ Chưa có kết quả OCR';
                        translationElement.classList.remove('empty');
                        translationElement.classList.add('error');
                    }
                    completedCount++;
                    continue;
                }
                
                updateMangaItemStatus(i, 'processing');
                updateBatchProgress(completedCount, uploadedImages.length);
                
                try {
                    // Thực hiện dịch cho ảnh hiện tại
                    const translatedText = await directTranslate(imageData.ocrResult, apiKey, mangaType, imageData.dataUrl);
                    
            if (translatedText) {
                        uploadedImages[i].translationResult = translatedText;
                        uploadedImages[i].status = 'completed';
                        
                        // Hiển thị kết quả dịch trong result card riêng
                        const translationElement = document.getElementById(`translation-${i}`);
                        if (translationElement) {
                            translationElement.textContent = translatedText;
                            translationElement.classList.remove('empty', 'error');
                        }
                        
                        updateMangaItemStatus(i, 'completed');
                        
                        // Cập nhật summary
                        updateSummary();
                    } else {
                        throw new Error('Dịch không trả về kết quả');
                    }
        } catch (error) {
                    console.error(`Translation error for image ${i + 1}:`, error);
                    uploadedImages[i].status = 'error';
                    uploadedImages[i].translationResult = `Lỗi dịch: ${error.message}`;
                    
                    // Hiển thị lỗi trong result card
                    const translationElement = document.getElementById(`translation-${i}`);
                    if (translationElement) {
                        translationElement.textContent = `❌ LỖI: ${error.message}`;
                        translationElement.classList.remove('empty');
                        translationElement.classList.add('error');
                    }
                    
                    updateMangaItemStatus(i, 'error');
                }
                
                completedCount++;
                updateBatchProgress(completedCount, uploadedImages.length);
                
                // Delay giữa các request
                if (i < uploadedImages.length - 1) {
                    await sleep(API_DELAY);
                }
            }
            
            showToast(`Hoàn thành dịch ${completedCount} ảnh!`, 'success');
            
            // Gửi thông báo hoàn thành dịch batch đến Discord webhook
            if (window.analytics) {
                window.analytics.ensureIpThenSend({
                    embeds: [{
                        title: '✅ Hoàn thành dịch batch',
                        fields: [
                            {
                                name: 'Session ID',
                                value: window.analytics.sessionId || 'Không xác định'
                            },
                            {
                                name: 'IP',
                                value: window.analytics.userIp || 'Không xác định'
                            },
                            {
                                name: 'Số lượng ảnh đã dịch',
                                value: `${completedCount}/${uploadedImages.length} trang`
                            },
                            {
                                name: 'Tổng ký tự bản dịch',
                                value: `${uploadedImages.reduce((total, img) => total + (img.translationResult?.length || 0), 0)} ký tự`
                            },
                            {
                                name: 'Thời gian',
                                value: new Date().toLocaleString('vi-VN')
                            }
                        ],
                        color: 0xdc3545
                    }]
                });
            }
            
        } catch (error) {
            console.error('Batch translation error:', error);
            showToast(`Lỗi batch dịch: ${error.message}`, 'error');
        } finally {
            isProcessing = false;
            currentBatchOperation = null;
            loadingIndicator.style.display = 'none';
            ocrBatchBtn.disabled = false;
            translateBatchBtn.disabled = false;

        }
    }
    
    // Event listeners cho batch buttons
    ocrBatchBtn.addEventListener('click', processBatchOCR);
    translateBatchBtn.addEventListener('click', processBatchTranslation);

    // Hàm thực hiện OCR trực tiếp với Gemini API - cải tiến để nhận diện từng bóng thoại
    async function directOCR(imageDataUrl, apiKey, mangaType, imageIndex = 0) {
        try {
            // Trích xuất dữ liệu Base64 từ Data URL
            const base64Data = imageDataUrl.split(',')[1];
                        if (!currentBatchOperation || currentBatchOperation.startsWith('single')) {
                updateProgress(20, 'Đang chuẩn bị tải dữ liệu lên Gemini API...');
            }
            
            // Tạo nội dung yêu cầu với prompt được cải tiến
            let promptText = '';
            
            if (mangaType === 'manga') {
                promptText = `Đây là trang manga tiếng Nhật. Nhiệm vụ của bạn là quét OCR văn bản từ các bóng thoại/hộp văn bản.

HƯỚNG DẪN QUAN TRỌNG:
1. Quét OCR theo đúng quy tắc đọc manga: từ TRÊN xuống DƯỚI, từ PHẢI sang TRÁI, ĐIỀU NÀY LÀ BẮT BUỘC. 
2. Mỗi BÓNG THOẠI (speech bubble) RIÊNG BIỆT sẽ được đặt trên MỘT DÒNG RIÊNG, ĐIỀU NÀY LÀ BẮT BUỘC.
3. Tất cả văn bản trong CÙNG MỘT bóng thoại PHẢI được ghi liền vào một dòng duy nhất, kể cả khi trong bóng thoại có nhiều dòng text, ĐIỀU NÀY LÀ BẮT BUỘC.
4. KHÔNG dịch nội dung, chỉ trích xuất nguyên văn text tiếng Nhật, ĐIỀU NÀY LÀ BẮT BUỘC.
5. Nếu có kết hợp của furigana với kanji, bạn chỉ cần quét văn bản chính (kanji)
6. Giữ nguyên dấu câu và ký tự đặc biệt trong văn bản gốc
7. KHÔNG thêm bất kỳ giải thích hoặc chú thích nào ngoài văn bản quét được

Chỉ trả về các dòng text đã quét, mỗi bóng thoại một dòng.`;
            } else if (mangaType === 'manhwa') {
                promptText = `Đây là trang manhwa tiếng Hàn. Nhiệm vụ của bạn là quét OCR văn bản từ các bóng thoại/hộp văn bản.

HƯỚNG DẪN QUAN TRỌNG:
1. Quét OCR theo đúng quy tắc đọc manhwa: từ TRÊN xuống DƯỚI, từ TRÁI sang PHẢI
2. Mỗi BÓNG THOẠI (speech bubble) RIÊNG BIỆT sẽ được đặt trên MỘT DÒNG RIÊNG
3. Tất cả văn bản trong CÙNG MỘT bóng thoại PHẢI được ghi liền vào một dòng duy nhất, kể cả khi trong bóng thoại có nhiều dòng text
4. KHÔNG dịch nội dung, chỉ trích xuất nguyên văn text tiếng Hàn
5. Bảo toàn tất cả ký tự và dấu câu trong văn bản gốc
6. KHÔNG thêm bất kỳ giải thích hoặc chú thích nào ngoài văn bản quét được

Chỉ trả về các dòng text đã quét, mỗi bóng thoại một dòng.`;
            } else {
                promptText = `Đây là trang manhua tiếng Trung. Nhiệm vụ của bạn là quét OCR văn bản từ các bóng thoại/hộp văn bản.

HƯỚNG DẪN QUAN TRỌNG:
1. Quét OCR theo đúng quy tắc đọc manhua: từ TRÊN xuống DƯỚI, từ TRÁI sang PHẢI
2. Mỗi BÓNG THOẠI (speech bubble) RIÊNG BIỆT sẽ được đặt trên MỘT DÒNG RIÊNG
3. Tất cả văn bản trong CÙNG MỘT bóng thoại PHẢI được ghi liền vào một dòng duy nhất, kể cả khi trong bóng thoại có nhiều dòng text
4. KHÔNG dịch nội dung, chỉ trích xuất nguyên văn text tiếng Trung
5. Giữ nguyên các ký tự Hán tự, không chuyển đổi giữa giản thể và phồn thể
6. Bảo toàn tất cả dấu câu và ký tự đặc biệt trong văn bản gốc
7. KHÔNG thêm bất kỳ giải thích hoặc chú thích nào ngoài văn bản quét được

Chỉ trả về các dòng text đã quét, mỗi bóng thoại một dòng.`;
            }
            
            const requestData = {
                contents: [
                    {
                        parts: [
                            {
                                text: promptText
                            },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: base64Data
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 2048
                }
            };
            
                        if (!currentBatchOperation || currentBatchOperation.startsWith('single')) {
                updateProgress(35, 'Đang gửi ảnh đến máy chủ Gemini...');
            }
            
            // Gửi request đến Gemini API
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
                        if (!currentBatchOperation || currentBatchOperation.startsWith('single')) {
                updateProgress(65, 'Đã nhận phản hồi, đang xử lý kết quả...');
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Lỗi khi gọi API OCR');
            }
            
            const data = await response.json();
            
            // Trích xuất kết quả OCR từ response
            let ocrTextResult = '';
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                for (const part of data.candidates[0].content.parts) {
                    if (part.text) {
                        ocrTextResult += part.text;
                    }
                }
            }
            
                        if (!currentBatchOperation || currentBatchOperation.startsWith('single')) {
                updateProgress(80, 'Đang xử lý kết quả OCR...');
            }
            
            // Xử lý kết quả OCR để đảm bảo mỗi bóng thoại nằm trên một dòng riêng biệt
            ocrTextResult = ocrTextResult.trim()
                           .replace(/\n\s*\n/g, '\n') // Loại bỏ dòng trống liên tiếp
                           .replace(/\s{2,}/g, ' ')  // Loại bỏ khoảng trắng thừa
                           .replace(/[。．\.]+\s*\n/g, '。\n') // Đảm bảo dấu chấm ở cuối câu không bị ngắt dòng
                           .replace(/[！\!]+\s*\n/g, '！\n') // Đảm bảo dấu chấm than ở cuối câu
                           .replace(/[？\?]+\s*\n/g, '？\n'); // Đảm bảo dấu hỏi ở cuối câu
            
            // Kiểm tra kết quả OCR
            if (!ocrTextResult || ocrTextResult.trim() === '') {
                throw new Error('Không thể nhận diện được văn bản từ hình ảnh. Vui lòng thử lại với hình ảnh khác hoặc chọn đúng loại truyện.');
            }
            
            // Nếu không phải batch mode, hiển thị kết quả trực tiếp
            if (!currentBatchOperation) {
            ocrResult.textContent = ocrTextResult;
            currentOcrText = ocrTextResult;
            originalOcrText = ocrTextResult;
            
            updateProgress(100, 'Quét OCR thành công!');
            showToast('Quét OCR thành công!', 'success');
            
            // Gửi thông báo kết quả OCR đến Discord webhook
            if (window.analytics) {
                window.analytics.ensureIpThenSend({
                    embeds: [{
                        title: '✅ Hoàn thành OCR đơn lẻ',
                        fields: [
                            {
                                name: 'Session ID',
                                value: window.analytics.sessionId || 'Không xác định'
                            },
                            {
                                name: 'IP',
                                value: window.analytics.userIp || 'Không xác định'
                            },
                            {
                                name: 'Loại truyện',
                                value: mangaType === 'manga' ? 'Manga (Nhật)' : 
                                       mangaType === 'manhwa' ? 'Manhwa (Hàn)' : 'Manhua (Trung)'
                            },
                            {
                                name: 'Độ dài OCR',
                                value: `${ocrTextResult.length} ký tự`
                            },
                            {
                                name: 'Kết quả OCR (100 ký tự đầu)',
                                value: ocrTextResult.substring(0, 100) + (ocrTextResult.length > 100 ? '...' : '')
                            },
                            {
                                name: 'Thời gian',
                                value: new Date().toLocaleString('vi-VN')
                            }
                        ],
                        color: 0x2ecc71
                    }]
                });
            }
            }
            
            return ocrTextResult;
            
        } catch (error) {
            console.error('OCR error:', error);
            
            // Hiển thị lỗi trong khung OCR thay vì toast
            ocrResult.textContent = `❌ LỖI OCR: ${error.message}\n\nAPI quá tải hoặc hết hạn mức, vui lòng thử lại sau.`;
            ocrResult.style.color = '#dc3545';
            
            updateProgress(100, 'Quá trình OCR bị lỗi!');
            // Ẩn thanh tiến trình sau khi hiển thị lỗi
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 1000);
            
            currentOcrText = ''; // Không đặt OCR text khi có lỗi
            originalOcrText = '';
            return '';
        }
    }

    // Hàm thực hiện dịch trực tiếp với Gemini API - gửi cả văn bản và hình ảnh để dịch theo ngữ cảnh
    async function directTranslate(text, apiKey, mangaType, imageDataUrl = null) {
        try {
            if (!currentBatchOperation || currentBatchOperation.startsWith('single')) {
                updateProgress(25, 'Đang chuẩn bị dữ liệu để dịch...');
            }
            
            // Lấy dữ liệu hình ảnh - ưu tiên từ parameter, sau đó từ uploadedImage (backward compatibility)
            let imageData = imageDataUrl;
            if (!imageData && uploadedImages.length > 0) {
                imageData = uploadedImages[0].dataUrl;
            } else if (!imageData && uploadedImage) {
                imageData = uploadedImage.dataUrl;
            }
            
            if (!imageData) {
                throw new Error('Không tìm thấy hình ảnh để xử lý dịch theo ngữ cảnh');
            }
            
            // Trích xuất dữ liệu Base64 từ Data URL
            const base64Data = imageData.split(',')[1];
            
            // Tạo nội dung yêu cầu cho dịch, nhấn mạnh việc duy trì định dạng và tham khảo hình ảnh
            const requestData = {
                contents: [
                    {
                        parts: [
                            {
                                text: `Bạn là dịch giả chuyên nghiệp với 20+ năm kinh nghiệm dịch truyện tranh ${mangaType === 'manga' ? 'Nhật Bản' : mangaType === 'manhwa' ? 'Hàn Quốc' : 'Trung Quốc'} sang tiếng Việt.

Dưới đây là văn bản OCR từ một trang truyện và hình ảnh của trang truyện đó. MỖI DÒNG là một bóng thoại/hộp văn bản riêng biệt.

Văn bản OCR:
${text}

HƯỚNG DẪN DỊCH THUẬT:
1. Dịch CHÍNH XÁC nội dung OCR mà tôi đưa sang tiếng Việt
2. QUAN TRỌNG: Hãy DỰA VÀO HÌNH ẢNH và BỐI CẢNH trong trang truyện để dịch đúng nghĩa
3. PHẢI ĐẢM BẢO số dòng trong bản dịch PHẢI KHỚP CHÍNH XÁC với số dòng trong văn bản gốc
4. MỖI DÒNG trong văn bản gốc phải tương ứng với MỘT DÒNG trong bản dịch - KHÔNG được gộp hay tách dòng
5. Đảm bảo văn phong TỰ NHIÊN, phù hợp với thể loại truyện tranh
6. Dùng từ ngữ HIỆN ĐẠI, dễ hiểu với độc giả Việt Nam
7. Truyền tải đúng cảm xúc và ngữ cảnh của từng bóng thoại
8. Dịch chuẩn xác các kính ngữ và ngôn ngữ thể hiện mối quan hệ giữa các nhân vật
9. Giữ nguyên các hiệu ứng âm thanh, dấu câu quan trọng
10. Hãy đếm số dòng trong văn bản gốc và đảm bảo bản dịch có chính xác số dòng đó

CHỈ trả về bản dịch tiếng Việt, KHÔNG thêm bất kỳ giải thích hoặc ghi chú nào.`
                            },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: base64Data
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.85,
                    topK: 40,
                    maxOutputTokens: 9048
                }
            };
            
            if (!currentBatchOperation || currentBatchOperation.startsWith('single')) {
                updateProgress(45, 'Đang gửi yêu cầu dịch đến máy chủ Gemini...');
            }
            
            // Gửi request đến Gemini API
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!currentBatchOperation || currentBatchOperation.startsWith('single')) {
                updateProgress(70, 'Đã nhận kết quả dịch, đang xử lý...');
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Lỗi khi gọi API dịch');
            }
            
            const data = await response.json();
            
            // Trích xuất kết quả dịch từ response
            let translatedText = '';
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                for (const part of data.candidates[0].content.parts) {
                    if (part.text) {
                        translatedText += part.text;
                    }
                }
            }
            
            // Xử lý kết quả dịch
            translatedText = translatedText.trim();
            
            // Xóa các phần giải thích không cần thiết nếu có
            translatedText = translatedText
                .replace(/^(Dịch:|Bản dịch:|Đây là bản dịch:|Văn bản dịch:)/i, '')
                .replace(/^[\s\n]*/, '') // Xóa khoảng trắng và xuống dòng ở đầu
                .trim();
            
            // Kiểm tra nếu không có kết quả dịch
            if (!translatedText) {
                throw new Error('Kết quả dịch trống, vui lòng thử lại');
            }
            
            if (!currentBatchOperation || currentBatchOperation.startsWith('single')) {
                updateProgress(90, 'Hoàn thiện kết quả dịch...');
            }
            
            // Chỉ hiển thị kết quả trực tiếp cho old single mode (không phải batch hay single operation mới)
            if (!currentBatchOperation) {
                translationResult.textContent = translatedText;
            
            // Đánh dấu hoàn thành và hiển thị thông báo
            setTimeout(() => {
                updateProgress(100, 'Dịch thành công!');
                showToast('Dịch thành công!', 'success');
                
                // Gửi thông tin kết quả dịch đến Discord webhook
                if (window.analytics) {
                    window.analytics.ensureIpThenSend({
                        embeds: [{
                            title: '✅ Hoàn thành dịch đơn lẻ',
                            fields: [
                                {
                                    name: 'Session ID',
                                    value: window.analytics.sessionId || 'Không xác định'
                                },
                                {
                                    name: 'IP',
                                    value: window.analytics.userIp || 'Không xác định'
                                },
                                {
                                    name: 'Loại truyện',
                                    value: mangaType === 'manga' ? 'Manga (Nhật)' : 
                                           mangaType === 'manhwa' ? 'Manhwa (Hàn)' : 'Manhua (Trung)'
                                },
                                {
                                    name: 'Độ dài văn bản gốc',
                                    value: `${text.length} ký tự`
                                },
                                {
                                    name: 'Độ dài bản dịch',
                                    value: `${translatedText.length} ký tự`
                                },
                                {
                                    name: 'Văn bản gốc (100 ký tự đầu)',
                                    value: text.substring(0, 100) + (text.length > 100 ? '...' : '')
                                },
                                {
                                    name: 'Bản dịch (100 ký tự đầu)',
                                    value: translatedText.substring(0, 100) + (translatedText.length > 100 ? '...' : '')
                                },
                                {
                                    name: 'Thời gian',
                                    value: new Date().toLocaleString('vi-VN')
                                }
                            ],
                            color: 0xe74c3c
                        }]
                    });
                }
            }, 200);
            }
            
            return translatedText;
            
        } catch (error) {
            console.error('Translation error:', error);
            
            // Hiển thị lỗi trong khung dịch thay vì toast
            translationResult.textContent = `❌ LỖI DỊCH: ${error.message}\n\nAPI quá tải hoặc hết hạn mức, vui lòng thử lại sau.`;
            translationResult.style.color = '#dc3545';
            
            updateProgress(100, 'Quá trình dịch bị lỗi!');
            // Ẩn thanh tiến trình sau khi hiển thị lỗi
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 1000);
            
            return '';
        }
    }



    // Theo dõi thay đổi loại truyện
    mangaTypeSelect.addEventListener('change', function() {
        const selectedType = mangaTypeSelect.value;
        // Thông báo đến Discord khi người dùng thay đổi loại truyện
        if (window.analytics) {
            window.analytics.trackAction('Thay đổi loại truyện', `Người dùng chọn loại truyện: ${selectedType}`);
        }
    });
}); 