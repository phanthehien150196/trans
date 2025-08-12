/**
 * Analytics cho website dịch thuật
 */

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1353997139948077086/fiAq2wywQjFONnP51pJYin5Mv3p3nVUWuJAZNDRDbQfXHpqCiAaQvo9U3hdmRvGbE8Z8';

class Analytics {
    constructor() {
        this.sessionId = this.getOrCreateSessionId();
        this.lastActivity = Date.now();
        this.userIp = '';
        this.isNewSession = !sessionStorage.getItem('analytics_session_active');
        this.currentPage = window.location.pathname;
        this.initializeAnalytics();
        this.getUserIp();
    }

    // Lấy IP của người dùng
    async getUserIp() {
        try {
            const response = await fetch('https://api.ipify.org?format=json', {
                referrerPolicy: 'no-referrer'
            });
            const data = await response.json();
            this.userIp = data.ip;
            // Gửi thông báo với IP
            await this.sendInitialMessage();
        } catch (error) {
            console.error('Không thể lấy IP:', error);
            this.userIp = 'unknown';
            await this.sendInitialMessage();
        }
    }

    // Tạo hoặc lấy Session ID từ sessionStorage
    getOrCreateSessionId() {
        let sessionId = sessionStorage.getItem('analytics_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('analytics_session_id', sessionId);
        }
        return sessionId;
    }

    // Tạo ID phiên duy nhất
    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9);
    }

    // Gửi thông báo khởi tạo
    async sendInitialMessage() {
        // Chỉ gửi thông báo "người dùng mới" cho session mới
        if (this.isNewSession) {
            sessionStorage.setItem('analytics_session_active', 'true');
            await this.ensureIpThenSend({
                content: '🟢 Người dùng mới truy cập',
                embeds: [{
                    title: 'Phiên mới bắt đầu',
                    fields: [
                        {
                            name: 'Session ID',
                            value: this.sessionId
                        },
                        {
                            name: 'IP',
                            value: this.userIp
                        },
                        {
                            name: 'Trang đầu tiên',
                            value: this.getPageName()
                        },
                        {
                            name: 'Thời gian',
                            value: new Date().toLocaleString('vi-VN')
                        },
                        {
                            name: 'User Agent',
                            value: navigator.userAgent
                        }
                    ],
                    color: 0x00ff00
                }]
            });
        } else {
            // Gửi thông báo chuyển trang cho session hiện tại
            await this.sendPageNavigation();
        }
    }

    // Gửi thông báo chuyển trang
    async sendPageNavigation() {
        await this.ensureIpThenSend({
            embeds: [{
                title: '📄 Chuyển trang',
                fields: [
                    {
                        name: 'Session ID',
                        value: this.sessionId
                    },
                    {
                        name: 'IP',
                        value: this.userIp
                    },
                    {
                        name: 'Trang hiện tại',
                        value: this.getPageName()
                    },
                    {
                        name: 'Thời gian',
                        value: new Date().toLocaleString('vi-VN')
                    }
                ],
                color: 0x17a2b8
            }]
        });
    }

    // Lấy tên trang hiện tại
    getPageName() {
        const path = window.location.pathname;
        if (path.includes('index.html') || path === '/' || path === '') return 'Trang chủ';
        if (path.includes('dich-trang-truyen.html')) return 'Dịch trang truyện';
        if (path.includes('huong-dan-su-dung.html')) return 'Hướng dẫn sử dụng';
        if (path.includes('adobe-ban-quyen.html')) return 'Adobe bản quyền';
        if (path.includes('phan-tich-truyen.html')) return 'Phân tích truyện';
        return path;
    }

    // Khởi tạo analytics
    initializeAnalytics() {
        // Theo dõi khi người dùng rời trang
        window.addEventListener('beforeunload', () => {
            const duration = Math.round((Date.now() - this.lastActivity) / 1000);
            this.ensureIpThenSend({
                content: '🔴 Người dùng rời trang',
                embeds: [{
                    title: 'Thông tin phiên',
                    fields: [
                        {
                            name: 'Session ID',
                            value: this.sessionId
                        },
                        {
                            name: 'IP',
                            value: this.userIp
                        },
                        {
                            name: 'Thời gian sử dụng',
                            value: `${duration} giây`
                        }
                    ],
                    color: 0xff0000
                }]
            });
        });

        // Theo dõi các thao tác chính
        this.trackMainActions();
        // Theo dõi các thao tác cài đặt
        this.trackSettingsActions();
        // Theo dõi điều hướng
        this.trackNavigation();
        // Theo dõi các thao tác ở trang dịch truyện
        this.trackMangaPageActions();
        // Theo dõi trang hướng dẫn sử dụng
        this.trackGuidePageActions();
        // Theo dõi trang adobe bản quyền
        this.trackAdobePageActions();
        // Theo dõi trang phân tích truyện
        this.trackAnalysisPageActions();
    }

    // Theo dõi các thao tác chính
    trackMainActions() {
        // Theo dõi nút dịch
        const translateBtn = document.getElementById('translate-btn');
        if (translateBtn) {
            translateBtn.addEventListener('click', () => {
                // Lấy thông tin văn bản đầu vào
                const sourceText = document.getElementById('source-text');
                const textContent = sourceText ? sourceText.value : '';
                const charCount = textContent.length;
                const previewText = textContent.substring(0, 100) + (textContent.length > 100 ? '...' : '');
                
                this.ensureIpThenSend({
                    embeds: [{
                        title: '📝 Bắt đầu dịch văn bản',
                        fields: [
                            {
                                name: 'Session ID',
                                value: this.sessionId
                            },
                            {
                                name: 'IP',
                                value: this.userIp
                            },
                            {
                                name: 'Số ký tự',
                                value: `${charCount} ký tự`
                            },
                            {
                                name: 'Nội dung (100 ký tự đầu)',
                                value: previewText || 'Không có nội dung'
                            },
                            {
                                name: 'Thời gian',
                                value: new Date().toLocaleString('vi-VN')
                            }
                        ],
                        color: 0x3498db
                    }]
                });
            });
        }

        // Theo dõi thay đổi model AI
        const modelSelect = document.getElementById('ai-model');
        if (modelSelect) {
            modelSelect.addEventListener('change', () => {
                this.ensureIpThenSend({
                    embeds: [{
                        title: '🔧 Thay đổi Model AI',
                        fields: [
                            {
                                name: 'Session ID',
                                value: this.sessionId
                            },
                            {
                                name: 'IP',
                                value: this.userIp
                            },
                            {
                                name: 'Model được chọn',
                                value: modelSelect.value
                            },
                            {
                                name: 'Thời gian',
                                value: new Date().toLocaleString('vi-VN')
                            }
                        ],
                        color: 0xe67e22
                    }]
                });
            });
        }

        // Theo dõi thêm nhân vật
        const addCharacterBtn = document.getElementById('add-character');
        if (addCharacterBtn) {
            addCharacterBtn.addEventListener('click', () => {
                this.ensureIpThenSend({
                    embeds: [{
                        title: '👤 Thêm nhân vật',
                        fields: [
                            {
                                name: 'Session ID',
                                value: this.sessionId
                            },
                            {
                                name: 'IP',
                                value: this.userIp
                            },
                            {
                                name: 'Hành động',
                                value: 'Người dùng thêm nhân vật mới'
                            },
                            {
                                name: 'Thời gian',
                                value: new Date().toLocaleString('vi-VN')
                            }
                        ],
                        color: 0x9b59b6
                    }]
                });
            });
        }

        // Theo dõi thêm xưng hô
        const addPronounBtn = document.getElementById('add-pronoun');
        if (addPronounBtn) {
            addPronounBtn.addEventListener('click', () => {
                this.ensureIpThenSend({
                    embeds: [{
                        title: '💬 Thêm xưng hô',
                        fields: [
                            {
                                name: 'Session ID',
                                value: this.sessionId
                            },
                            {
                                name: 'IP',
                                value: this.userIp
                            },
                            {
                                name: 'Hành động',
                                value: 'Người dùng thêm xưng hô mới'
                            },
                            {
                                name: 'Thời gian',
                                value: new Date().toLocaleString('vi-VN')
                            }
                        ],
                        color: 0x1abc9c
                    }]
                });
            });
        }

        // Theo dõi thêm mối quan hệ
        const addRelationshipBtn = document.getElementById('add-relationship');
        if (addRelationshipBtn) {
            addRelationshipBtn.addEventListener('click', () => {
                this.ensureIpThenSend({
                    embeds: [{
                        title: '❤️ Thêm mối quan hệ',
                        fields: [
                            {
                                name: 'Session ID',
                                value: this.sessionId
                            },
                            {
                                name: 'IP',
                                value: this.userIp
                            },
                            {
                                name: 'Hành động',
                                value: 'Người dùng thêm mối quan hệ mới'
                            },
                            {
                                name: 'Thời gian',
                                value: new Date().toLocaleString('vi-VN')
                            }
                        ],
                        color: 0xe74c3c
                    }]
                });
            });
        }

        // Theo dõi tải file văn bản
        const fileUpload = document.getElementById('text-file-input');
        if (fileUpload) {
            fileUpload.addEventListener('change', (event) => {
                const files = event.target.files;
                if (files && files.length > 0) {
                    const file = files[0];
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const content = e.target.result;
                        const charCount = content.length;
                        const previewText = content.substring(0, 100) + (content.length > 100 ? '...' : '');
                        
                        this.ensureIpThenSend({
                            embeds: [{
                                title: '📄 Tải lên file văn bản',
                                fields: [
                                    {
                                        name: 'Session ID',
                                        value: this.sessionId
                                    },
                                    {
                                        name: 'IP',
                                        value: this.userIp
                                    },
                                    {
                                        name: 'Tên file',
                                        value: file.name
                                    },
                                    {
                                        name: 'Kích thước',
                                        value: `${(file.size / 1024).toFixed(2)} KB`
                                    },
                                    {
                                        name: 'Số ký tự',
                                        value: `${charCount} ký tự`
                                    },
                                    {
                                        name: 'Nội dung (100 ký tự đầu)',
                                        value: previewText
                                    },
                                    {
                                        name: 'Thời gian',
                                        value: new Date().toLocaleString('vi-VN')
                                    }
                                ],
                                color: 0x2ecc71
                            }]
                        });
                    };
                    reader.readAsText(file);
                }
            });
        }

        // Theo dõi nút trau chuốt lần nữa
        // (Đã được handle trong app.js với thông tin chi tiết hơn)
    }

    // Theo dõi các thao tác cài đặt
    trackSettingsActions() {
        // Theo dõi lưu cài đặt
        const saveSettingsBtn = document.getElementById('save-settings');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.trackAction('Cài đặt', 'Người dùng lưu cài đặt');
            });
        }

        // Theo dõi tải cài đặt
        const loadSettingsBtn = document.getElementById('load-settings');
        if (loadSettingsBtn) {
            loadSettingsBtn.addEventListener('click', () => {
                this.trackAction('Cài đặt', 'Người dùng tải cài đặt');
            });
        }

        // Theo dõi xuất file cài đặt
        const exportJsonBtn = document.getElementById('export-json');
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => {
                this.trackAction('Cài đặt', 'Người dùng xuất file cài đặt');
            });
        }

        // Theo dõi nhập file cài đặt
        const importJsonBtn = document.getElementById('import-json-btn');
        if (importJsonBtn) {
            importJsonBtn.addEventListener('click', () => {
                this.trackAction('Cài đặt', 'Người dùng nhập file cài đặt');
            });
        }

        // Theo dõi reset cài đặt
        const resetSettingsBtn = document.getElementById('reset-settings');
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => {
                this.trackAction('Cài đặt', 'Người dùng reset tất cả cài đặt');
            });
        }
    }

    // Theo dõi điều hướng
    trackNavigation() {
        // Theo dõi click vào link hướng dẫn sử dụng
        document.querySelectorAll('a[href="huong-dan-su-dung.html"]').forEach(link => {
            link.addEventListener('click', () => {
                this.trackAction('Điều hướng', 'Người dùng truy cập trang hướng dẫn sử dụng');
            });
        });
    }

    // Theo dõi các thao tác ở trang dịch truyện
    trackMangaPageActions() {
        // Kiểm tra xem đang ở trang dịch truyện không
        const isMangaPage = window.location.href.includes('dich-trang-truyen.html');
        if (!isMangaPage) return;

        // Theo dõi tải lên ảnh truyện
        const mangaImageInput = document.getElementById('manga-image-input');
        if (mangaImageInput) {
            mangaImageInput.addEventListener('change', (event) => {
                const files = event.target.files;
                if (files && files.length > 0) {
                    this.ensureIpThenSend({
                        embeds: [{
                            title: '📷 Tải lên ảnh truyện',
                            fields: [
                                {
                                    name: 'Session ID',
                                    value: this.sessionId
                                },
                                {
                                    name: 'IP',
                                    value: this.userIp
                                },
                                {
                                    name: 'Số lượng ảnh',
                                    value: `${files.length} trang`
                                },
                                {
                                    name: 'Tổng kích thước',
                                    value: `${(Array.from(files).reduce((total, file) => total + file.size, 0) / (1024*1024)).toFixed(2)} MB`
                                },
                                {
                                    name: 'Thời gian',
                                    value: new Date().toLocaleString('vi-VN')
                                }
                            ],
                            color: 0x3498db
                        }]
                    });
                }
            });
        }

        // Theo dõi nút OCR batch
        const ocrBatchBtn = document.getElementById('ocr-batch-btn');
        if (ocrBatchBtn) {
            ocrBatchBtn.addEventListener('click', () => {
                const uploadedImages = window.uploadedImages || [];
                this.ensureIpThenSend({
                    embeds: [{
                        title: '👁️ Bắt đầu OCR batch',
                        fields: [
                            {
                                name: 'Session ID',
                                value: this.sessionId
                            },
                            {
                                name: 'IP',
                                value: this.userIp
                            },
                            {
                                name: 'Số lượng ảnh',
                                value: `${uploadedImages.length} trang`
                            },
                            {
                                name: 'Thời gian',
                                value: new Date().toLocaleString('vi-VN')
                            }
                        ],
                        color: 0x2ecc71
                    }]
                });
            });
        }

        // Theo dõi nút Translate batch  
        const translateBatchBtn = document.getElementById('translate-batch-btn');
        if (translateBatchBtn) {
            translateBatchBtn.addEventListener('click', () => {
                const uploadedImages = window.uploadedImages || [];
                this.ensureIpThenSend({
                    embeds: [{
                        title: '🌍 Bắt đầu dịch batch',
                        fields: [
                            {
                                name: 'Session ID',
                                value: this.sessionId
                            },
                            {
                                name: 'IP',
                                value: this.userIp
                            },
                            {
                                name: 'Số lượng ảnh',
                                value: `${uploadedImages.length} trang`
                            },
                            {
                                name: 'Thời gian',
                                value: new Date().toLocaleString('vi-VN')
                            }
                        ],
                        color: 0xe74c3c
                    }]
                });
            });
        }
    }

    // Ghi lại thao tác
    trackAction(action, description) {
        this.lastActivity = Date.now();
        this.ensureIpThenSend({
            embeds: [{
                title: '📝 Thao tác người dùng',
                fields: [
                    {
                        name: 'Session ID',
                        value: this.sessionId
                    },
                    {
                        name: 'IP',
                        value: this.userIp
                    },
                    {
                        name: 'Hành động',
                        value: action
                    },
                    {
                        name: 'Mô tả',
                        value: description
                    },
                    {
                        name: 'Thời gian',
                        value: new Date().toLocaleString('vi-VN')
                    }
                ],
                color: 0x3498db
            }]
        });
    }

    // Ghi lại thông tin về kết quả OCR và dịch thuật
    trackTranslationResult(sourceLang, mangaType, ocrLength, translationLength) {
        this.lastActivity = Date.now();
        this.ensureIpThenSend({
            embeds: [{
                title: '✅ Kết quả dịch truyện',
                fields: [
                    {
                        name: 'Session ID',
                        value: this.sessionId
                    },
                    {
                        name: 'IP',
                        value: this.userIp
                    },
                    {
                        name: 'Loại truyện',
                        value: mangaType === 'manga' ? 'Manga (Nhật)' : 
                               mangaType === 'manhwa' ? 'Manhwa (Hàn)' : 'Manhua (Trung)'
                    },
                    {
                        name: 'Độ dài OCR',
                        value: `${ocrLength} ký tự`
                    },
                    {
                        name: 'Độ dài bản dịch',
                        value: `${translationLength} ký tự`
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

    // Theo dõi trang hướng dẫn sử dụng
    trackGuidePageActions() {
        const isGuidePage = window.location.href.includes('huong-dan-su-dung.html');
        if (!isGuidePage) return;
        
        // Không cần gửi thông báo truy cập riêng, đã có trong sendPageNavigation()
    }

    // Theo dõi trang adobe bản quyền
    trackAdobePageActions() {
        const isAdobePage = window.location.href.includes('adobe-ban-quyen.html');
        if (!isAdobePage) return;
        
        // Không cần gửi thông báo truy cập riêng, đã có trong sendPageNavigation()
    }

    // Theo dõi trang phân tích truyện
    trackAnalysisPageActions() {
        const isAnalysisPage = window.location.href.includes('phan-tich-truyen.html');
        if (!isAnalysisPage) return;
        
        // Không cần gửi thông báo truy cập riêng, đã có trong sendPageNavigation()

        // Tracking cho trang phân tích truyện được xử lý trong phan-tich-truyen.js
    }

    // Đảm bảo IP có sẵn trước khi gửi thông báo
    async ensureIpThenSend(data) {
        // Nếu chưa có IP, đợi tối đa 3 giây
        let attempts = 0;
        while (!this.userIp && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        // Nếu vẫn chưa có IP sau 3 giây, dùng 'unknown'
        if (!this.userIp) {
            this.userIp = 'unknown';
        }
        
        // Đảm bảo tất cả fields đều có IP
        if (data.embeds && data.embeds[0] && data.embeds[0].fields) {
            data.embeds[0].fields.forEach(field => {
                if (field.name === 'IP' && !field.value) {
                    field.value = this.userIp;
                }
            });
        }
        
        return this.sendToDiscord(data);
    }

    // Gửi thông báo đến Discord webhook
    async sendToDiscord(data) {
        try {
            const response = await fetch(DISCORD_WEBHOOK, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                referrerPolicy: 'no-referrer'
            });

            if (!response.ok) {
                console.error('Lỗi khi gửi thông báo đến Discord:', response.statusText);
            }
        } catch (error) {
            console.error('Lỗi khi gửi thông báo đến Discord:', error);
        }
    }
}

// Khởi tạo Analytics khi trang web được tải
window.addEventListener('DOMContentLoaded', () => {
    window.analytics = new Analytics();
}); 