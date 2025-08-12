document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo biến toàn cục
    const { jsPDF } = window.jspdf;
    
    // DOM Elements
    const zipFileInput = document.getElementById('zip-file-input');
    const fileInfo = document.getElementById('file-info');
    const analyzeBtn = document.getElementById('analyze-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressStatus = document.getElementById('progress-status');
    const contentResult = document.getElementById('content-result');
    const charactersResult = document.getElementById('characters-result');
    const settingResult = document.getElementById('setting-result');
    const copyContentBtn = document.getElementById('copy-content-btn');
    const copyCharactersBtn = document.getElementById('copy-characters-btn');
    const copySettingBtn = document.getElementById('copy-setting-btn');
    const googleApiKeyInput = document.getElementById('google-api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const toggleApiKeyBtn = document.getElementById('toggle-api-key-btn');
    const mangaTypeSelect = document.getElementById('manga-type-select');
    const progressSteps = Array.from(document.querySelectorAll('.progress-step'));
    
    // Thêm nút tải xuống PDF - sẽ tạo động khi cần
    let downloadPdfBtn = null;
    
    // State variables
    let isProcessing = false;
    let extractedImages = [];
    let pdfBase64 = null;
    let savedApiKey = '';
    
    // Kiểm tra khả năng hỗ trợ File API
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        console.log('File API được hỗ trợ trong trình duyệt này.');
    } else {
        showToast('Trình duyệt của bạn không hỗ trợ File API. Vui lòng sử dụng trình duyệt hiện đại hơn.', 'error');
    }
    
    // Khởi tạo
    loadSavedApiKey();
    
    // Event Listeners
    zipFileInput.addEventListener('change', handleZipUpload);
    analyzeBtn.addEventListener('click', analyzeChapter);
    saveApiKeyBtn.addEventListener('click', saveApiKey);
    toggleApiKeyBtn.addEventListener('click', toggleApiKeyVisibility);
    copyContentBtn.addEventListener('click', () => copyText(contentResult));
    copyCharactersBtn.addEventListener('click', () => copyText(charactersResult));
    copySettingBtn.addEventListener('click', () => copyText(settingResult));
    
    // Hàm hiển thị thông báo
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
    
    // Hàm cập nhật thanh tiến trình
    function updateProgress(percent, statusText) {
        progressContainer.style.display = 'block';
        progressBar.style.width = percent + '%';
        progressStatus.textContent = statusText;
        
        if (percent >= 100) {
            setTimeout(() => {
                progressContainer.style.display = 'none';
                progressBar.style.width = '0%';
            }, 1500);
        }
    }
    
    // Hàm cập nhật trạng thái bước
    function updateProgressStep(step) {
        // Reset tất cả các bước
        progressSteps.forEach(step => {
            step.classList.remove('step-active', 'step-completed');
        });
        
        // Đánh dấu các bước đã hoàn thành và đang hoạt động
        for (let i = 0; i < step; i++) {
            progressSteps[i].classList.add('step-completed');
        }
        
        if (step <= progressSteps.length) {
            progressSteps[step - 1].classList.add('step-active');
        }
    }
    
    // Tải API key đã lưu
    function loadSavedApiKey() {
        try {
            // Kiểm tra trong translationAppSettings trước
            const translationSettings = localStorage.getItem('translationAppSettings');
            if (translationSettings) {
                const settings = JSON.parse(translationSettings);
                if (settings && settings.googleApiKey) {
                    googleApiKeyInput.value = settings.googleApiKey;
                    savedApiKey = settings.googleApiKey;
                    
                    setTimeout(() => {
                        showToast('Đã tìm thấy API key đã lưu!', 'info');
                    }, 1000);
                    return;
                }
            }
            
            // Thử lấy từ key riêng
            const apiKey = localStorage.getItem('google-api-key');
            if (apiKey) {
                googleApiKeyInput.value = apiKey;
                savedApiKey = apiKey;
                
                setTimeout(() => {
                    showToast('Đã tìm thấy API key đã lưu!', 'info');
                }, 1000);
            } else {
                setTimeout(() => {
                    showToast('Vui lòng nhập Google AI Studio API key!', 'info');
                }, 1000);
            }
        } catch (e) {
            console.error('Lỗi khi đọc API key từ localStorage:', e);
        }
    }
    
    // Lưu API key
    function saveApiKey() {
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
    }
    
    // Hiển thị/ẩn API key
    function toggleApiKeyVisibility() {
        if (googleApiKeyInput.type === 'password') {
            googleApiKeyInput.type = 'text';
            toggleApiKeyBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            googleApiKeyInput.type = 'password';
            toggleApiKeyBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }
    
    // Lấy API key
    function getGoogleAPIKey() {
        // Ưu tiên sử dụng API key từ ô input
        let apiKey = googleApiKeyInput.value.trim();
        
        // Nếu không có trong input, thử lấy từ biến
        if (!apiKey && savedApiKey) {
            apiKey = savedApiKey;
            googleApiKeyInput.value = savedApiKey;
        }
        
        // Nếu vẫn không có, thử lấy từ localStorage
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
    
    // Xử lý tải lên file ZIP
    async function handleZipUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
            showToast('Vui lòng chọn file ZIP!', 'error');
            return;
        }
        
        try {
            // Gửi thông báo Discord về việc tải lên file ZIP
            if (window.analytics) {
                window.analytics.ensureIpThenSend({
                    embeds: [{
                        title: '📚 Tải lên file ZIP phân tích truyện',
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
                                name: 'Tên file',
                                value: file.name
                            },
                            {
                                name: 'Kích thước file',
                                value: `${(file.size / (1024*1024)).toFixed(2)} MB`
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
            
            // Vô hiệu hóa các điều khiển khi đang xử lý
            zipFileInput.disabled = true;
            analyzeBtn.disabled = true;
            
            updateProgressStep(1); // Đang tải file
            updateProgress(10, 'Đang đọc file ZIP...');
            
            // Đặt lại trạng thái
            resetResults();
            extractedImages = [];
            pdfBase64 = null;
            
            // Hiển thị thông tin file
            fileInfo.innerHTML = `
                <div class="file-info-item">
                    <strong>Tên file:</strong> ${file.name}
                </div>
                <div class="file-info-item">
                    <strong>Kích thước:</strong> ${formatFileSize(file.size)}
                </div>
            `;
            
            // Đọc file ZIP
            const zipData = await readFileAsArrayBuffer(file);
            updateProgress(30, 'Đang giải nén và xử lý file...');
            
            // Giải nén file ZIP
            const zip = await JSZip.loadAsync(zipData);
            
            // Lọc ra chỉ các file ảnh
            const imageFiles = [];
            for (const filename in zip.files) {
                const zipEntry = zip.files[filename];
                
                // Bỏ qua các thư mục và file không phải ảnh
                if (zipEntry.dir || !isImageFile(filename)) continue;
                
                // Thêm vào danh sách file ảnh
                imageFiles.push({
                    name: filename,
                    entry: zipEntry
                });
            }
            
            if (imageFiles.length === 0) {
                throw new Error('Không tìm thấy file ảnh nào trong file ZIP!');
            }
            
            // Sắp xếp file ảnh theo thứ tự tên
            imageFiles.sort((a, b) => {
                // Trích xuất số từ tên file (nếu có)
                const numA = extractNumberFromFilename(a.name);
                const numB = extractNumberFromFilename(b.name);
                
                if (numA !== null && numB !== null) {
                    return numA - numB;
                }
                
                // Nếu không có số, sắp xếp theo tên
                return a.name.localeCompare(b.name);
            });
            
            updateProgress(50, 'Đang xử lý dữ liệu...');
            
            // Xử lý từng file ảnh
            for (let i = 0; i < imageFiles.length; i++) {
                const { name, entry } = imageFiles[i];
                
                // Đọc dữ liệu ảnh
                const blob = await entry.async('blob');
                
                // Thêm vào danh sách ảnh đã trích xuất
                extractedImages.push({
                    name: name,
                    blob: blob
                });
                
                // Cập nhật tiến trình
                updateProgress(50 + Math.floor((i + 1) / imageFiles.length * 30), 
                    `Đang xử lý dữ liệu: ${i + 1}/${imageFiles.length}`);
            }
            
            updateProgress(80, 'Đang hoàn thiện xử lý...');
            
            // Chuyển đổi dữ liệu cho AI
            await processDataForAI();
            
            updateProgress(100, 'Đã tải và xử lý file thành công!');
            showToast(`Đã tải ${extractedImages.length} trang ảnh từ file ZIP!`, 'success');
            
            // Gửi thông báo Discord về việc trích xuất ảnh thành công
            if (window.analytics) {
                window.analytics.ensureIpThenSend({
                    embeds: [{
                        title: '✅ Trích xuất ảnh từ ZIP thành công',
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
                                name: 'Số lượng ảnh trích xuất',
                                value: `${extractedImages.length} trang`
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
            
            analyzeBtn.disabled = false;
            
        } catch (error) {
            console.error('Lỗi khi xử lý file ZIP:', error);
            showToast('Lỗi: ' + error.message, 'error');
            fileInfo.innerHTML = `<div class="error-message">Lỗi: ${error.message}</div>`;
        } finally {
            isProcessing = false;
            analyzeBtn.disabled = false;
            zipFileInput.disabled = false; // Bật lại input file
        }
    }
    
    // Hàm xử lý dữ liệu cho AI (thay thế hàm createPDF)
    async function processDataForAI() {
        try {
            updateProgressStep(2); // Đang xử lý file
            updateProgress(10, 'Đang chuẩn bị dữ liệu...');
            
            // Tạo PDF mới
            const pdf = new jsPDF('p', 'mm', 'a4', true);
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // Thêm từng ảnh vào PDF
            for (let i = 0; i < extractedImages.length; i++) {
                if (i > 0) {
                    pdf.addPage();
                }
                
                // Cập nhật tiến trình
                updateProgress(10 + Math.floor((i + 1) / extractedImages.length * 70),
                    `Đang xử lý trang ${i + 1}/${extractedImages.length}...`);
                
                // Chuyển Blob thành Base64
                const imageData = await blobToBase64(extractedImages[i].blob);
                
                // Thêm ảnh vào PDF, fit trong trang
                const imgProps = pdf.getImageProperties(imageData);
                const imgWidth = pageWidth;
                const imgHeight = (imgProps.height * pageWidth) / imgProps.width;
                
                if (imgHeight > pageHeight) {
                    // Nếu ảnh quá cao, scale lại để fit theo chiều cao
                    const scaleFactor = pageHeight / imgHeight;
                    pdf.addImage(imageData, 'JPEG', 0, 0, imgWidth * scaleFactor, pageHeight);
                } else {
                    // Nếu ảnh vừa, căn giữa theo chiều dọc
                    const yOffset = (pageHeight - imgHeight) / 2;
                    pdf.addImage(imageData, 'JPEG', 0, yOffset, imgWidth, imgHeight);
                }
            }
            
            updateProgress(80, 'Đang chuẩn bị phân tích...');
            
            // Chuyển PDF thành base64 string
            const pdfOutput = pdf.output('datauristring');
            pdfBase64 = pdfOutput.split(',')[1]; // Lấy phần base64 sau dấu phẩy
            
            // Tạo nút tải xuống PDF để kiểm tra
            createDownloadPdfButton();
            
            updateProgress(100, 'Dữ liệu đã sẵn sàng để phân tích!');
            return pdfBase64;
            
        } catch (error) {
            console.error('Lỗi khi xử lý dữ liệu:', error);
            showToast('Lỗi khi xử lý dữ liệu: ' + error.message, 'error');
            throw error;
        }
    }
    
    // Hàm phân tích chương truyện
    async function analyzeChapter() {
        // Kiểm tra trạng thái xử lý
        if (isProcessing) {
            showToast('Đang xử lý, vui lòng đợi...', 'warning');
            return;
        }
        
        // Kiểm tra dữ liệu đầu vào
        if (!pdfBase64 || extractedImages.length === 0) {
            showToast('Vui lòng tải lên file ZIP trước!', 'error');
            return;
        }
        
        // Lấy API key
        const apiKey = getGoogleAPIKey();
        if (!apiKey) {
            showToast('Vui lòng nhập API key trước khi phân tích!', 'error');
            return;
        }
        
        try {
            // Gửi thông báo Discord về việc bắt đầu phân tích
            if (window.analytics) {
                window.analytics.ensureIpThenSend({
                    embeds: [{
                        title: '🔍 Bắt đầu phân tích chương truyện',
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
                                name: 'Số lượng trang',
                                value: `${extractedImages.length} trang`
                            },
                            {
                                name: 'Loại truyện',
                                value: mangaTypeSelect.value === 'manga' ? 'Manga (Nhật)' : 
                                       mangaTypeSelect.value === 'manhwa' ? 'Manhwa (Hàn)' : 'Manhua (Trung)'
                            },
                            {
                                name: 'Thời gian',
                                value: new Date().toLocaleString('vi-VN')
                            }
                        ],
                        color: 0xf39c12
                    }]
                });
            }
            
            // Đặt trạng thái đang xử lý
            isProcessing = true;
            
            // Vô hiệu hóa tất cả các control
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang phân tích...';
            zipFileInput.disabled = true;
            saveApiKeyBtn.disabled = true;
            mangaTypeSelect.disabled = true;
            
            // Hiển thị loading
            loadingIndicator.style.display = 'block';
            
            updateProgressStep(3); // Đang phân tích
            updateProgress(10, 'Đang chuẩn bị phân tích chương truyện...');
            
            // Lấy loại truyện
            const mangaType = mangaTypeSelect.value;
            
            // Gửi request đến Google AI Studio
            const analysisResult = await sendAnalysisRequest(pdfBase64, apiKey, mangaType);
            
            // Hiển thị kết quả
            displayAnalysisResults(analysisResult);
            
            // Cập nhật trạng thái
            updateProgressStep(4); // Kết quả
            updateProgress(100, 'Phân tích hoàn tất!');
            showToast('Phân tích chương truyện thành công!', 'success');
            
            // Gửi thông báo Discord về kết quả phân tích
            if (window.analytics) {
                const contentLength = contentResult.textContent?.length || 0;
                const charactersLength = charactersResult.textContent?.length || 0;
                const settingLength = settingResult.textContent?.length || 0;
                
                window.analytics.ensureIpThenSend({
                    embeds: [{
                        title: '✅ Hoàn thành phân tích chương truyện',
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
                                name: 'Số trang đã phân tích',
                                value: `${extractedImages.length} trang`
                            },
                            {
                                name: 'Nội dung chương',
                                value: `${contentLength} ký tự`
                            },
                            {
                                name: 'Thông tin nhân vật',
                                value: `${charactersLength} ký tự`
                            },
                            {
                                name: 'Bối cảnh/Setting',
                                value: `${settingLength} ký tự`
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
            
            // Kích hoạt các nút sao chép
            copyContentBtn.disabled = false;
            copyCharactersBtn.disabled = false;
            copySettingBtn.disabled = false;
            
        } catch (error) {
            console.error('Lỗi khi phân tích chương truyện:', error);
            showToast('Lỗi: ' + error.message, 'error');
            updateProgress(100, 'Phân tích thất bại!');
        } finally {
            // Reset trạng thái
            isProcessing = false;
            
            // Bật lại tất cả các control
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-chart-bar"></i> Phân tích chương truyện';
            zipFileInput.disabled = false;
            saveApiKeyBtn.disabled = false;
            mangaTypeSelect.disabled = false;
            
            // Ẩn loading
            loadingIndicator.style.display = 'none';
        }
    }
    
    // Gửi request phân tích đến Google AI Studio
    async function sendAnalysisRequest(pdfBase64, apiKey, mangaType) {
        try {
            updateProgress(30, 'Đang gửi yêu cầu phân tích...');
            
            // Tạo prompt dựa trên loại truyện
            let prompt = '';
            
            switch (mangaType) {
                case 'manga':
                    prompt = `Hãy phân tích chương truyện manga này và trả về CHÍNH XÁC định dạng JSON sau đây:

{
  "content": "Tóm tắt ngắn gọn diễn biến chính của chương: sự kiện quan trọng, xung đột, kết quả",
  "characters": [
    {
      "name": "Tên nhân vật",
      "role": "Vai trò/địa vị của nhân vật",
      "action": "Hành động chính của nhân vật trong chương này"
    }
  ],
  "setting": {
    "location": "Địa điểm chính diễn ra",
    "time": "Thời gian (ngày/đêm, quá khứ/hiện tại)",
    "atmosphere": "Không khí chung của chương (căng thẳng, bí ẩn, vui vẻ...)"
  }
}

LƯU Ý QUAN TRỌNG:
- CHỈ trả về JSON hợp lệ, không có text khác
- characters phải là ARRAY chứa tất cả nhân vật quan trọng trong chương
- Mỗi field là văn bản ngắn gọn, rõ ràng bằng tiếng Việt
- Đảm bảo syntax JSON đúng với dấu ngoặc kép`;
                    break;
                case 'manhwa':
                    prompt = `Hãy phân tích chương truyện manhwa này và trả về CHÍNH XÁC định dạng JSON sau đây:

{
  "content": "Tóm tắt ngắn gọn diễn biến chính của chương: sự kiện quan trọng, xung đột, kết quả",
  "characters": [
    {
      "name": "Tên nhân vật",
      "role": "Vai trò/địa vị của nhân vật",
      "action": "Hành động chính của nhân vật trong chương này"
    }
  ],
  "setting": {
    "location": "Địa điểm chính diễn ra",
    "time": "Thời gian (ngày/đêm, quá khứ/hiện tại)",
    "atmosphere": "Không khí chung của chương (căng thẳng, bí ẩn, vui vẻ...)"
  }
}

LƯU Ý QUAN TRỌNG:
- CHỈ trả về JSON hợp lệ, không có text khác
- characters phải là ARRAY chứa tất cả nhân vật quan trọng trong chương
- Mỗi field là văn bản ngắn gọn, rõ ràng bằng tiếng Việt
- Đảm bảo syntax JSON đúng với dấu ngoặc kép`;
                    break;
                case 'manhua':
                    prompt = `Hãy phân tích chương truyện manhua này và trả về CHÍNH XÁC định dạng JSON sau đây:

{
  "content": "Tóm tắt ngắn gọn diễn biến chính của chương: sự kiện quan trọng, xung đột, kết quả",
  "characters": [
    {
      "name": "Tên nhân vật",
      "role": "Vai trò/địa vị của nhân vật",
      "action": "Hành động chính của nhân vật trong chương này"
    }
  ],
  "setting": {
    "location": "Địa điểm chính diễn ra",
    "time": "Thời gian (ngày/đêm, quá khứ/hiện tại)",
    "atmosphere": "Không khí chung của chương (căng thẳng, bí ẩn, vui vẻ...)"
  }
}

LƯU Ý QUAN TRỌNG:
- CHỈ trả về JSON hợp lệ, không có text khác
- characters phải là ARRAY chứa tất cả nhân vật quan trọng trong chương
- Mỗi field là văn bản ngắn gọn, rõ ràng bằng tiếng Việt
- Đảm bảo syntax JSON đúng với dấu ngoặc kép`;
                    break;
                default:
                    prompt = `Hãy phân tích chương truyện này và trả về CHÍNH XÁC định dạng JSON sau đây:

{
  "content": "Tóm tắt ngắn gọn diễn biến chính của chương: sự kiện quan trọng, xung đột, kết quả",
  "characters": [
    {
      "name": "Tên nhân vật",
      "role": "Vai trò/địa vị của nhân vật",
      "action": "Hành động chính của nhân vật trong chương này"
    }
  ],
  "setting": {
    "location": "Địa điểm chính diễn ra",
    "time": "Thời gian (ngày/đêm, quá khứ/hiện tại)",
    "atmosphere": "Không khí chung của chương (căng thẳng, bí ẩn, vui vẻ...)"
  }
}

LƯU Ý QUAN TRỌNG:
- CHỈ trả về JSON hợp lệ, không có text khác
- characters phải là ARRAY chứa tất cả nhân vật quan trọng trong chương
- Mỗi field là văn bản ngắn gọn, rõ ràng bằng tiếng Việt
- Đảm bảo syntax JSON đúng với dấu ngoặc kép`;
            }

            // Kiểm tra dữ liệu PDF
            if (!pdfBase64) {
                throw new Error("Không có dữ liệu PDF để phân tích");
            }

            // Kiểm tra và đảm bảo format đúng của base64
            if (pdfBase64.startsWith('data:')) {
                // Nếu dữ liệu có định dạng data URI, trích xuất phần base64
                const base64Match = pdfBase64.match(/^data:[^;]+;base64,(.+)$/);
                if (base64Match) {
                    pdfBase64 = base64Match[1];
                }
            }
            
            console.log(`PDF Base64 length: ${pdfBase64.length} characters`);
            
            // Tạo request body theo đúng format hoạt động từ mẫu
            // CHÚ Ý: Thứ tự quan trọng - đặt PDF trước, sau đó là prompt
            const requestData = {
                contents: [{
                    parts: [
                        { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
                        { text: prompt }
                    ]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 4096,
                }
            };

            console.log("Request structure (without PDF data):", 
                JSON.stringify({
                    ...requestData,
                    contents: [{
                        parts: [
                            { inline_data: { mime_type: "application/pdf", data: "[PDF_DATA]" } },
                            { text: "[PROMPT]" }
                        ]
                    }]
                }, null, 2)
            );

            updateProgress(50, 'Đang phân tích chương truyện...');

            // Stringify một lần và lưu kết quả để tránh stringify nhiều lần
            const requestBody = JSON.stringify(requestData);
            console.log(`Request body length: ${requestBody.length} characters`);

            // Tạo request với URL và headers chính xác
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: requestBody
            });
            
            console.log(`Response status: ${response.status} ${response.statusText}`);
            
            // Xử lý lỗi response
            if (!response.ok) {
                let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error?.message || errorMessage;
                } catch (e) {
                    // Nếu không parse được JSON, sử dụng errorMessage mặc định
                }
                console.error("API Error:", errorMessage);
                throw new Error(errorMessage);
            }
            
            // Parse response JSON
            const responseData = await response.json();
            console.log("Response full data:", JSON.stringify(responseData, null, 2));
            
            // Kiểm tra nếu bị block bởi Google
            if (responseData.promptFeedback && responseData.promptFeedback.blockReason) {
                console.error("Content blocked:", responseData.promptFeedback);
                throw new Error(`Nội dung bị chặn bởi Google API (${responseData.promptFeedback.blockReason}). Vui lòng kiểm tra PDF hoặc thử với ít trang hơn.`);
            }
            
            console.log("Response structure:", JSON.stringify({
                candidates: responseData.candidates ? [{
                    content: {
                        parts: responseData.candidates[0]?.content?.parts ? 
                            [{text: "[TEXT_CONTENT]"}] : "No parts found"
                    }
                }] : "No candidates found"
            }, null, 2));
            
            // Trích xuất kết quả văn bản
            let resultText = '';
            
            if (responseData.candidates && 
                responseData.candidates[0] && 
                responseData.candidates[0].content && 
                responseData.candidates[0].content.parts) {
                
                // Lặp qua tất cả các phần để tổng hợp kết quả
                for (const part of responseData.candidates[0].content.parts) {
                    if (part.text) {
                        resultText += part.text;
                    }
                }
            }
            
            // Kiểm tra kết quả
            if (!resultText || resultText.trim() === '') {
                throw new Error('Nhận được phản hồi từ API nhưng không có nội dung văn bản');
            }
            
            // Log một phần nội dung để debug
            console.log("Response content preview:", resultText.substring(0, 100) + "...");
            
            updateProgress(80, 'Đang xử lý kết quả...');
            
            // Chuyển đổi nội dung cốt truyện
            const convertContentToHTML = (content) => {
                if (!content || typeof content !== 'string') {
                    return '<p class="empty-text">Không có nội dung để hiển thị.</p>';
                }
                
                let html = content.trim();
                html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                
                return `<p class="content-text">${html}</p>`;
            };
            
            // Chuyển đổi danh sách nhân vật
            const convertCharactersToHTML = (characters) => {
                if (!characters || !Array.isArray(characters) || characters.length === 0) {
                    return '<p class="empty-text">Không có thông tin nhân vật.</p>';
                }
                
                const characterTexts = characters.map(char => {
                    const name = char.name || 'Không rõ tên';
                    const role = char.role || 'Không rõ vai trò';
                    const action = char.action || 'Không có thông tin hành động';
                    
                    return `<strong>${name}</strong>: ${role}. ${action}`;
                }).join('<br>');
                
                return `<p class="content-text">${characterTexts}</p>`;
            };
            
            // Chuyển đổi thông tin bối cảnh
            const convertSettingToHTML = (setting) => {
                if (!setting || typeof setting !== 'object') {
                    return '<p class="empty-text">Không có thông tin bối cảnh.</p>';
                }
                
                const location = setting.location || 'Không rõ địa điểm';
                const time = setting.time || 'Không rõ thời gian';
                const atmosphere = setting.atmosphere || 'Không rõ không khí';
                
                const settingText = `<strong>Địa điểm:</strong> ${location}<br><strong>Thời gian:</strong> ${time}<br><strong>Không khí:</strong> ${atmosphere}`;
                
                return `<p class="content-text">${settingText}</p>`;
            };
            
            // Tách nội dung thành các phần từ JSON
            let parts = {
                content: '',
                characters: '',
                setting: ''
            };
            
            try {
                console.log("Đang xử lý JSON response...");
                
                // Làm sạch response text
                let cleanedText = resultText.trim();
                
                // Loại bỏ markdown code blocks nếu có
                cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
                
                // Tìm JSON trong response
                const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
                let jsonData = null;
                
                if (jsonMatch) {
                    try {
                        jsonData = JSON.parse(jsonMatch[0]);
                        console.log("JSON parsed successfully:", jsonData);
                    } catch (parseError) {
                        console.error("JSON parse error:", parseError);
                        throw parseError;
                    }
                } else {
                    throw new Error("Không tìm thấy JSON trong response");
                }
                
                // Kiểm tra cấu trúc JSON
                if (!jsonData || typeof jsonData !== 'object') {
                    throw new Error("JSON không đúng cấu trúc");
                }
                
                // Trích xuất và chuyển đổi từng phần từ JSON
                parts.content = jsonData.content ? 
                    convertContentToHTML(jsonData.content.trim()) : 
                    '<p class="empty-text">Không có thông tin nội dung.</p>';
                
                parts.characters = jsonData.characters ? 
                    convertCharactersToHTML(jsonData.characters) : 
                    '<p class="empty-text">Không có thông tin nhân vật.</p>';
                
                parts.setting = jsonData.setting ? 
                    convertSettingToHTML(jsonData.setting) : 
                    '<p class="empty-text">Không có thông tin bối cảnh.</p>';
                
            } catch (jsonError) {
                console.error('Lỗi JSON parsing:', jsonError);
                
                // Fallback: tạo nội dung thông báo lỗi
                const errorMsg = 'Có lỗi khi xử lý kết quả phân tích. Vui lòng thử lại.';
                parts.content = `<p class="empty-text">${errorMsg}</p>`;
                parts.characters = `<p class="empty-text">${errorMsg}</p>`;
                parts.setting = `<p class="empty-text">${errorMsg}</p>`;
            }
            
            return parts;
            
        } catch (error) {
            console.error('Lỗi khi gửi request hoặc xử lý kết quả:', error);
            
            // Phân loại và trả về lỗi cụ thể hơn
            if (error.message.includes('API Error') || error.message.includes('Google AI API')) {
                throw new Error(`Lỗi API Google: ${error.message}`);
            } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                throw new Error('Lỗi kết nối: Vui lòng kiểm tra kết nối internet của bạn');
            } else if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
                throw new Error('Lỗi: Quá thời gian phân tích, vui lòng thử lại');
            } else {
                throw new Error(`Lỗi phân tích: ${error.message}`);
            }
        }
    }
    
    // Hiển thị kết quả phân tích
    function displayAnalysisResults(results) {
        // Sử dụng innerHTML thay vì textContent để hỗ trợ hiển thị markdown
        contentResult.innerHTML = results.content;
        charactersResult.innerHTML = results.characters;
        settingResult.innerHTML = results.setting;
        
        // Cuộn đến kết quả
        document.querySelector('.result-section').scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
        
        // Ẩn thanh tiến trình và loading indicator
        progressContainer.style.display = 'none';
        loadingIndicator.style.display = 'none';
        
        // Kích hoạt các nút sao chép
        copyContentBtn.disabled = false;
        copyCharactersBtn.disabled = false;
        copySettingBtn.disabled = false;
    }
    
    // Sao chép văn bản
    function copyText(element) {
        const text = element.textContent;
        
        if (!text || text.trim() === '') {
            showToast('Không có nội dung để sao chép!', 'warning');
            return;
        }
        
        try {
            // Vô hiệu hóa nút khi đang sao chép
            const copyButtons = [copyContentBtn, copyCharactersBtn, copySettingBtn];
            copyButtons.forEach(btn => btn.disabled = true);
            
            // Sử dụng Clipboard API
            navigator.clipboard.writeText(text)
                .then(() => {
                    showToast('Đã sao chép nội dung!', 'success');
                })
                .catch(err => {
                    console.error('Lỗi khi sao chép:', err);
                    showToast('Lỗi khi sao chép nội dung!', 'error');
                })
                .finally(() => {
                    // Bật lại các nút sau khi hoàn thành
                    copyButtons.forEach(btn => btn.disabled = false);
                });
        } catch (error) {
            console.error('Lỗi khi sao chép:', error);
            showToast('Lỗi khi sao chép nội dung!', 'error');
            
            // Đảm bảo các nút được bật lại khi có lỗi
            const copyButtons = [copyContentBtn, copyCharactersBtn, copySettingBtn];
            copyButtons.forEach(btn => btn.disabled = false);
        }
    }
    
    // Reset kết quả
    function resetResults() {
        contentResult.innerHTML = '<p class="placeholder-text">Tóm tắt nội dung của chương truyện sẽ được hiển thị ở đây sau khi phân tích.</p>';
        charactersResult.innerHTML = '<p class="placeholder-text">Danh sách nhân vật và hành động của họ sẽ được hiển thị ở đây sau khi phân tích.</p>';
        settingResult.innerHTML = '<p class="placeholder-text">Thông tin về bối cảnh, không gian, thời gian trong truyện sẽ được hiển thị ở đây sau khi phân tích.</p>';
        
        // Vô hiệu hóa các nút sao chép
        copyContentBtn.disabled = true;
        copyCharactersBtn.disabled = true;
        copySettingBtn.disabled = true;
    }
    
    // Đọc file dưới dạng ArrayBuffer
    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                resolve(e.target.result);
            };
            
            reader.onerror = function(e) {
                reject(new Error('Lỗi khi đọc file: ' + e.target.error));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    // Kiểm tra nếu file là ảnh
    function isImageFile(filename) {
        const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const lowerFilename = filename.toLowerCase();
        return extensions.some(ext => lowerFilename.endsWith(ext));
    }
    
    // Trích xuất số từ tên file
    function extractNumberFromFilename(filename) {
        // Tìm tất cả các số trong tên file
        const matches = filename.match(/\d+/g);
        
        if (matches && matches.length > 0) {
            // Trả về số đầu tiên tìm thấy
            return parseInt(matches[0], 10);
        }
        
        return null;
    }
    
    // Chuyển đổi kích thước file sang dạng đọc được
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Chuyển đổi Blob thành Base64
    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function() {
                resolve(reader.result);
            };
            reader.onerror = function(error) {
                reject(error);
            };
            reader.readAsDataURL(blob);
        });
    }

    // Thêm hàm tải xuống PDF
    function createDownloadPdfButton() {
        // Kiểm tra nếu button đã tồn tại, nếu có thì xóa để tạo mới
        if (downloadPdfBtn) {
            downloadPdfBtn.remove();
        }
        
        // Tạo button mới
        downloadPdfBtn = document.createElement('button');
        downloadPdfBtn.className = 'btn btn-secondary mt-2';
        downloadPdfBtn.innerHTML = '<i class="fas fa-download"></i> Tải PDF để kiểm tra';
        downloadPdfBtn.onclick = downloadGeneratedPdf;
        
        // Thêm vào sau fileInfo
        fileInfo.parentNode.insertBefore(downloadPdfBtn, fileInfo.nextSibling);
    }

    // Hàm tải xuống PDF đã tạo
    function downloadGeneratedPdf() {
        if (!pdfBase64) {
            showToast('Không có PDF để tải xuống!', 'error');
            return;
        }
        
        try {
            // Tạo URL từ dữ liệu base64
            let pdfDataUrl = pdfBase64;
            
            // Nếu pdfBase64 không bắt đầu bằng data:, thêm phần header
            if (!pdfBase64.startsWith('data:')) {
                pdfDataUrl = 'data:application/pdf;base64,' + pdfBase64;
            }
            
            // Tạo link tải xuống
            const a = document.createElement('a');
            a.href = pdfDataUrl;
            a.download = 'manga_preview.pdf';
            document.body.appendChild(a);
            a.click();
            
            // Xóa phần tử sau khi đã dùng
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
            }, 100);
            
            showToast('Đang tải xuống PDF...', 'success');
        } catch (error) {
            console.error('Lỗi khi tải xuống PDF:', error);
            showToast('Lỗi khi tải xuống PDF: ' + error.message, 'error');
        }
    }
}); 