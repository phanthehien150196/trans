/**
 * Xử lý sự kiện nhấn giữ trên thiết bị di động để hiển thị nút hành động
 */
document.addEventListener('DOMContentLoaded', function() {
    // Xử lý menu điện thoại
    function setupMobileNav() {
        const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
        const navLinks = document.querySelector('.nav-links');
        
        if (mobileNavToggle) {
            mobileNavToggle.addEventListener('click', function() {
                if (navLinks.classList.contains('show')) {
                    navLinks.classList.remove('show');
                } else {
                    navLinks.classList.add('show');
                }
            });
            
            // Auto scroll tới menu item active
            const activeMenuItem = document.querySelector('.nav-links .active');
            if (activeMenuItem && window.innerWidth < 769) {
                setTimeout(() => {
                    const container = document.querySelector('.nav-links');
                    const scrollPosition = activeMenuItem.offsetLeft - (container.clientWidth / 2) + (activeMenuItem.clientWidth / 2);
                    container.scrollLeft = Math.max(0, scrollPosition);
                }, 100);
            }
        }
    }
    
    setupMobileNav();
    
    // Trì hoãn việc thiết lập để đảm bảo tất cả các phần tử DOM đã được tải
    setTimeout(function() {
        // Hàm xử lý sự kiện nhấn giữ trên thiết bị di động
        function setupMobileLongPress() {
            console.log("Setup mobile long press");
            // Kiểm tra xem có phải thiết bị di động không (kích thước màn hình nhỏ hơn 769px)
            const isMobile = window.innerWidth < 769;
            
            if (isMobile) {
                // Biến để theo dõi hàng đang được active
                let activeRow = null;
                let longPressTimer = null;
                const LONG_PRESS_DURATION = 500; // 500ms để nhận biết nhấn giữ
                
                // Hàm để đóng tất cả các nút hành động đang hiển thị
                function closeAllActionButtons() {
                    try {
                        document.querySelectorAll('.editable-text.active').forEach(cell => {
                            cell.classList.remove('active');
                        });
                        activeRow = null;
                    } catch (e) {
                        console.error("Lỗi khi đóng nút hành động:", e);
                    }
                }
                
                // Xóa các sự kiện nhấn giữ cũ
                function removeOldTouchListeners() {
                    try {
                        document.querySelectorAll('.editable-text').forEach(cell => {
                            cell.removeEventListener('touchstart', handleTouchStart);
                            cell.removeEventListener('touchend', handleTouchEnd);
                            cell.removeEventListener('touchmove', handleTouchMove);
                            cell.removeEventListener('touchcancel', handleTouchCancel);
                        });
                    } catch (e) {
                        console.error("Lỗi khi xóa sự kiện cũ:", e);
                    }
                }
                
                // Xử lý sự kiện touch
                function handleTouchStart(e) {
                    try {
                        // Kiểm tra nếu đối tượng event hoặc target không tồn tại
                        if (!e || !e.target) return;
                        
                        // Nếu đang ở trong textarea hoặc input, không xử lý nhấn giữ
                        if (e.target.tagName && (
                            e.target.tagName.toLowerCase() === 'textarea' || 
                            e.target.tagName.toLowerCase() === 'input' ||
                            e.target.tagName.toLowerCase() === 'select' ||
                            e.target.tagName.toLowerCase() === 'button')) {
                            return;
                        }
                        
                        // Nếu đã có hàng đang active khác, đóng nó trước
                        if (activeRow && activeRow !== this) {
                            activeRow.classList.remove('active');
                        }
                        
                        // Lưu tham chiếu đến phần tử hiện tại để sử dụng trong timeout
                        const currentCell = this;
                        
                        // Bắt đầu đếm thời gian nhấn giữ
                        if (longPressTimer) clearTimeout(longPressTimer);
                        
                        longPressTimer = setTimeout(() => {
                            currentCell.classList.add('active');
                            activeRow = currentCell;
                            
                            // Thêm phản hồi xúc giác nếu thiết bị hỗ trợ
                            try {
                                if (window.navigator && window.navigator.vibrate) {
                                    window.navigator.vibrate(50); // Rung nhẹ 50ms
                                }
                            } catch (e) {
                                // Bỏ qua lỗi vibration API không được hỗ trợ
                                console.log("Vibration API không được hỗ trợ:", e);
                            }
                        }, LONG_PRESS_DURATION);
                    } catch (e) {
                        console.error("Lỗi trong handleTouchStart:", e);
                    }
                }
                
                function handleTouchEnd() {
                    if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                }
                
                function handleTouchMove() {
                    if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                }
                
                function handleTouchCancel() {
                    if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                }
                
                // Xử lý tất cả các ô có thể edit
                function setupLongPressForCells() {
                    try {
                        console.log("Thiết lập sự kiện nhấn giữ cho các ô");
                        // Đầu tiên, xóa tất cả các sự kiện cũ
                        removeOldTouchListeners();
                        
                        // Sau đó thêm mới các sự kiện
                        const editableCells = document.querySelectorAll('.editable-text');
                        console.log(`Tìm thấy ${editableCells.length} ô có thể edit`);
                        
                        editableCells.forEach((cell, index) => {
                            cell.addEventListener('touchstart', handleTouchStart);
                            cell.addEventListener('touchend', handleTouchEnd);
                            cell.addEventListener('touchmove', handleTouchMove);
                            cell.addEventListener('touchcancel', handleTouchCancel);
                        });
                    } catch (e) {
                        console.error("Lỗi khi thiết lập sự kiện nhấn giữ:", e);
                    }
                }
                
                // Đóng nút khi nhấp ra ngoài
                function handleOutsideClick(e) {
                    try {
                        if (!e.target.closest('.table-row-actions') && !e.target.closest('.editable-text.active')) {
                            closeAllActionButtons();
                        }
                    } catch (e) {
                        console.error("Lỗi khi xử lý nhấp chuột bên ngoài:", e);
                    }
                }
                
                // Xóa sự kiện click cũ nếu có
                document.removeEventListener('click', handleOutsideClick);
                // Thêm sự kiện click mới
                document.addEventListener('click', handleOutsideClick);
                
                // Thiết lập ban đầu
                console.log("Gọi setupLongPressForCells");
                setupLongPressForCells();
                
                // Thiết lập Mutation Observer để phát hiện thay đổi DOM
                try {
                    let observer = null;
                    
                    // Tạo observer mới
                    observer = new MutationObserver(function(mutations) {
                        let shouldUpdate = false;
                        
                        mutations.forEach(function(mutation) {
                            // Chỉ xử lý khi có thay đổi node con
                            if (mutation.type === 'childList') {
                                shouldUpdate = true;
                            }
                        });
                        
                        if (shouldUpdate) {
                            // Đặt timeout ngắn để đảm bảo DOM đã được cập nhật
                            setTimeout(setupLongPressForCells, 300);
                        }
                    });
                    
                    // Theo dõi các thay đổi trong bảng văn bản
                    const textTableBody = document.getElementById('text-table-body');
                    if (textTableBody) {
                        console.log("Đã tìm thấy text-table-body");
                        observer.observe(textTableBody, { 
                            childList: true,
                            subtree: true
                        });
                    } else {
                        console.log("Không tìm thấy text-table-body");
                        // Tìm kiếm theo cách khác
                        const textTable = document.querySelector('.text-table');
                        if (textTable) {
                            const tbody = textTable.querySelector('tbody');
                            if (tbody) {
                                console.log("Tìm thấy tbody");
                                observer.observe(tbody, {
                                    childList: true,
                                    subtree: true
                                });
                            }
                        }
                    }
                    
                    // Theo dõi cả container để phát hiện khi bảng được tạo mới
                    const translationPanel = document.querySelector('.translation-panel');
                    if (translationPanel) {
                        console.log("Đã tìm thấy translation-panel");
                        observer.observe(translationPanel, {
                            childList: true,
                            subtree: true
                        });
                    } else {
                        console.log("Không tìm thấy translation-panel");
                        // Tìm container gần nhất
                        const appContainer = document.querySelector('.app-container');
                        if (appContainer) {
                            observer.observe(appContainer, {
                                childList: true,
                                subtree: true
                            });
                        }
                    }
                    
                    // Lưu observer để có thể tái sử dụng
                    window.mobileTableObserver = observer;
                    
                } catch (e) {
                    console.error("Lỗi khi thiết lập Mutation Observer:", e);
                }
            }
        }
        
        // Gọi hàm thiết lập nhấn giữ
        setupMobileLongPress();
        
        // Xử lý sự kiện khi thay đổi kích thước cửa sổ
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(setupMobileLongPress, 500);
        });
        
        // Thêm sự kiện cho các nút chính có thể gây ra thay đổi DOM
        const setupButtonListeners = function() {
            try {
                const importBtn = document.getElementById('import-json-btn');
                if (importBtn) {
                    importBtn.addEventListener('click', function() {
                        setTimeout(setupMobileLongPress, 1000);
                    });
                }
                
                const addRowBtn = document.querySelector('.btn-add');
                if (addRowBtn) {
                    addRowBtn.addEventListener('click', function() {
                        setTimeout(setupMobileLongPress, 500);
                    });
                }
                
                const loadSettingsBtn = document.getElementById('load-settings');
                if (loadSettingsBtn) {
                    loadSettingsBtn.addEventListener('click', function() {
                        setTimeout(setupMobileLongPress, 1000);
                    });
                }
                
                // Thêm xử lý cho nút tải lên tệp
                const fileUploadInput = document.getElementById('file-upload');
                if (fileUploadInput) {
                    fileUploadInput.addEventListener('change', function() {
                        setTimeout(setupMobileLongPress, 1500);
                    });
                }
                
                // Thêm xử lý cho nút dịch
                const translateBtn = document.getElementById('translate-btn');
                if (translateBtn) {
                    translateBtn.addEventListener('click', function() {
                        setTimeout(setupMobileLongPress, 3000);
                    });
                }
            } catch (e) {
                console.error("Lỗi khi thiết lập sự kiện cho nút:", e);
            }
        };
        
        // Thiết lập các sự kiện cho các nút chính
        setupButtonListeners();
        
        // Kiểm tra lại sau khi trang đã tải hoàn toàn
        window.addEventListener('load', function() {
            setTimeout(setupMobileLongPress, 1000);
            setTimeout(setupButtonListeners, 1200);
        });

    }, 800); // Trì hoãn khởi tạo
}); 