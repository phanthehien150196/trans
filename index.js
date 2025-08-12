/**
 * Đảm bảo tính năng nhấn giữ hoạt động trên Cloudflare Pages
 */
(function() {
    // Kiểm tra nếu đang chạy trên Cloudflare Pages
    const isCloudflare = window.location.hostname.includes('pages.dev') || 
                         window.location.hostname.includes('cloudflare');
    
    // Hàm kiểm tra xem trang đã tải xong chưa
    function isPageLoaded() {
        return document.readyState === 'complete';
    }

    // Hàm kiểm tra DOM có chứa các phần tử cần thiết không
    function checkDOMReady() {
        return !!document.querySelector('.editable-text') || 
               !!document.querySelector('.text-table');
    }

    // Hàm thiết lập sự kiện nhấn giữ
    function initializeMobileLongPress() {
        console.log("Khởi tạo mobile-touch.js từ index.js");
        
        // Thêm class vào body để CSS có thể nhận diện
        document.body.classList.add('mobile-touch-initialized');
        
        // Nếu script chưa được tải, tải lại
        if (typeof setupMobileLongPress === 'undefined') {
            const script = document.createElement('script');
            script.src = 'mobile-touch.js?v=' + new Date().getTime();
            script.onload = function() {
                console.log("Đã tải lại mobile-touch.js");
            };
            document.head.appendChild(script);
        }
        
        // Thiết lập lại chế độ nhấn giữ trên thiết bị di động sau một khoảng thời gian
        setTimeout(function() {
            try {
                // Xóa class active khỏi tất cả các phần tử
                document.querySelectorAll('.editable-text.active').forEach(function(el) {
                    el.classList.remove('active');
                });
                
                // Tìm tất cả các ô có thể edit
                const editableCells = document.querySelectorAll('.editable-text');
                console.log("Tìm thấy " + editableCells.length + " ô có thể edit");
                
                // Nếu tìm thấy các ô, thiết lập sự kiện nhấn giữ
                if (editableCells.length > 0) {
                    setupMobileListeners(editableCells);
                }
            } catch (e) {
                console.error("Lỗi khi khởi tạo mobile long press:", e);
            }
        }, 1000);
    }
    
    // Thiết lập sự kiện nhấn giữ cho các ô
    function setupMobileListeners(cells) {
        // Biến để theo dõi hàng đang được active
        let activeRow = null;
        let longPressTimer = null;
        const LONG_PRESS_DURATION = 500; // 500ms để nhận biết nhấn giữ
        
        // Hàm đóng tất cả các nút hành động
        function closeActionButtons() {
            document.querySelectorAll('.editable-text.active').forEach(function(cell) {
                cell.classList.remove('active');
            });
            activeRow = null;
        }
        
        // Hàm xử lý sự kiện nhấn giữ
        function handleTouchStart(e) {
            // Nếu đang ở trong textarea, input hoặc button, không xử lý
            if (e.target.tagName && (
                e.target.tagName.toLowerCase() === 'textarea' || 
                e.target.tagName.toLowerCase() === 'input' ||
                e.target.tagName.toLowerCase() === 'select' ||
                e.target.tagName.toLowerCase() === 'button')) {
                return;
            }
            
            // Nếu đã có hàng active, đóng nó
            if (activeRow && activeRow !== this) {
                activeRow.classList.remove('active');
            }
            
            // Tham chiếu đến ô hiện tại
            const currentCell = this;
            
            // Bắt đầu đếm thời gian
            if (longPressTimer) clearTimeout(longPressTimer);
            
            longPressTimer = setTimeout(function() {
                currentCell.classList.add('active');
                activeRow = currentCell;
                
                // Phản hồi rung nếu được hỗ trợ
                try {
                    if (window.navigator && window.navigator.vibrate) {
                        window.navigator.vibrate(50);
                    }
                } catch (e) {
                    // Bỏ qua lỗi vibration
                }
            }, LONG_PRESS_DURATION);
        }
        
        // Xử lý sự kiện kết thúc chạm
        function handleTouchEnd() {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }
        
        // Thêm sự kiện cho các ô
        cells.forEach(function(cell) {
            cell.addEventListener('touchstart', handleTouchStart);
            cell.addEventListener('touchend', handleTouchEnd);
            cell.addEventListener('touchmove', handleTouchEnd);
            cell.addEventListener('touchcancel', handleTouchEnd);
        });
        
        // Thêm sự kiện click ra ngoài để đóng nút
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.table-row-actions') && !e.target.closest('.editable-text.active')) {
                closeActionButtons();
            }
        });
    }

    // Kiểm tra và khởi tạo
    function checkAndInitialize() {
        if (isPageLoaded() && checkDOMReady()) {
            initializeMobileLongPress();
        } else {
            setTimeout(checkAndInitialize, 500);
        }
    }

    // Khởi tạo khi trang tải xong
    window.addEventListener('load', function() {
        setTimeout(initializeMobileLongPress, 1000);
        
        // Nếu đang chạy trên Cloudflare, thiết lập kiểm tra thường xuyên
        if (isCloudflare) {
            // Kiểm tra lại mỗi 2 giây trong 30 giây đầu
            let checkCount = 0;
            const maxChecks = 15;
            
            const checkInterval = setInterval(function() {
                if (checkDOMReady() || checkCount >= maxChecks) {
                    clearInterval(checkInterval);
                    if (checkDOMReady()) {
                        initializeMobileLongPress();
                    }
                }
                checkCount++;
            }, 2000);
        }
    });

    // Thiết lập MutationObserver để theo dõi thay đổi DOM
    try {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Nếu có thêm node mới, kiểm tra xem có các ô có thể edit không
                    const hasEditableCells = Array.from(mutation.addedNodes).some(function(node) {
                        return node.nodeType === 1 && 
                               (node.classList && node.classList.contains('editable-text') || 
                                node.querySelector && node.querySelector('.editable-text'));
                    });
                    
                    if (hasEditableCells) {
                        setTimeout(initializeMobileLongPress, 500);
                    }
                }
            });
        });
        
        // Bắt đầu theo dõi thay đổi trong body
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } catch (e) {
        console.error("Lỗi khi thiết lập MutationObserver:", e);
    }
    
    // Khởi tạo ngay khi DOM sẵn sàng
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndInitialize);
    } else {
        checkAndInitialize();
    }
})(); 