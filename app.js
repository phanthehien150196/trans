document.addEventListener('DOMContentLoaded', function() {
    // API constants
    const GOOGLE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';
    
    // Biến lưu API key Google
    let originalRefinedTranslation = '';
    
    // DOM elements
    const googleApiKeyInput = document.getElementById('google-api-key');
    const characterContainer = document.getElementById('characters-container');
    const relationshipContainer = document.getElementById('relationships-container');
    const pronounContainer = document.getElementById('pronouns-container');
    const expressionsContainer = document.getElementById('expressions-container');
    const contextInput = document.getElementById('context');
    const genreInput = document.getElementById('genre');
    const styleInput = document.getElementById('style');
    const requirementsInput = document.getElementById('requirements');
    const sourceTextInput = document.getElementById('source-text');
    const textFileInput = document.getElementById('text-file-input');
    const textTableBody = document.getElementById('text-table-body');
    const translateBtn = document.getElementById('translate-btn');
    const translationResult = document.getElementById('translation-result');
    const loadingIndicator = document.getElementById('loading-indicator');
    const refineAgainBtn = document.getElementById('refine-again-btn');
    
    // Biến trạng thái
    let isLoading = false;
    
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
    
    // Thêm các nút sao chép cho kết quả dịch
    const outputSection = document.querySelector('.output-section');
    const resultActions = document.createElement('div');
    resultActions.className = 'result-actions';
    
    // Button to copy as text
    const copyTextBtn = document.createElement('button');
    copyTextBtn.textContent = 'Sao chép kết quả';
    copyTextBtn.className = 'btn btn-secondary btn-small';
    copyTextBtn.addEventListener('click', function() {
        navigator.clipboard.writeText(translationResult.textContent).then(() => {
            showToast('Đã sao chép kết quả!', 'success');
        }).catch(err => {
            console.error('Lỗi khi sao chép:', err);
            showToast('Không thể sao chép: ' + err.message, 'error');
        });
    });
    
    resultActions.appendChild(copyTextBtn);
    outputSection.appendChild(resultActions);
    
    // Templates
    const characterTemplate = document.getElementById('character-template');
    const relationshipTemplate = document.getElementById('relationship-template');
    const pronounTemplate = document.getElementById('pronoun-template');
    const expressionTemplate = document.getElementById('expression-template');
    
    // Cập nhật trạng thái ban đầu của các nút
    updateButtonState();
    
    // Thêm nút thêm dòng mới
    addNewRowButton();
    


    // Thêm chức năng hiển thị/ẩn API key của Google
    document.getElementById('toggle-google-api-key').addEventListener('click', function() {
        if (googleApiKeyInput.type === 'password') {
            googleApiKeyInput.type = 'text';
            this.textContent = '🔒';
        } else {
            googleApiKeyInput.type = 'password';
            this.textContent = '👁️';
        }
    });
    
    // Add event listeners for buttons
    document.getElementById('add-character').addEventListener('click', addCharacter);
    document.getElementById('add-relationship').addEventListener('click', addRelationship);
    document.getElementById('add-pronoun').addEventListener('click', addPronoun);
    document.getElementById('add-expression').addEventListener('click', addExpression);
    translateBtn.addEventListener('click', translateText);
    refineAgainBtn.addEventListener('click', refineAgain);
    textFileInput.addEventListener('change', handleFileUpload);
    
    // Thêm nút lưu và tải cài đặt
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    document.getElementById('load-settings').addEventListener('click', loadSettings);
    document.getElementById('export-json').addEventListener('click', exportToJson);
    document.getElementById('import-json-btn').addEventListener('click', function() {
        document.getElementById('import-json').click();
    });
    document.getElementById('import-json').addEventListener('change', importFromJson);
    document.getElementById('reset-settings').addEventListener('click', resetSettings);
    

    
    // Thêm event listeners cho trường nhập
    genreInput.addEventListener('input', function() {
        markAsChanged();
    });
    styleInput.addEventListener('input', function() {
        markAsChanged();
    });
    requirementsInput.addEventListener('input', function() {
        markAsChanged();
    });
    contextInput.addEventListener('input', function() {
        markAsChanged();
    });
    sourceTextInput.addEventListener('input', function() {
        markAsChanged();
    });
    
    // Characters data array
    let characters = [];
    // Expressions data array
    let expressions = [];
    // Lưu các cặp XƯNG hô đã tồn tại để tránh trùng lặp
    let existingPronounPairs = new Set();
    // Biến để theo dõi trạng thái
    let hasUnsavedChanges = false;
    // Lines of text for translation
    let textLines = [];
    
    // Không còn tự động lưu định kỳ
    
    // Cập nhật trạng thái khi có thay đổi
    function markAsChanged() {
        hasUnsavedChanges = true;
    }
    
    // Thêm sự kiện beforeunload để cảnh báo người dùng khi rời trang mà chưa lưu
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
            // Hiển thị thông báo
            const confirmationMessage = 'Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn rời khỏi trang?';
            e.returnValue = confirmationMessage;
            return confirmationMessage;
        }
    });
    
    // Kiểm tra xem các phần tử DOM đã được tạo chưa
    if (!characterContainer || !relationshipContainer || !pronounContainer || 
        !contextInput || !genreInput || !styleInput || !requirementsInput || 
        !sourceTextInput || !googleApiKeyInput) {
        console.error("Không thể tìm thấy một hoặc nhiều phần tử DOM cần thiết!");
        alert("Lỗi khởi tạo ứng dụng. Vui lòng tải lại trang.");
    } else {
        console.log("Các phần tử DOM đã được tìm thấy:", {
            characterContainer: !!characterContainer,
            relationshipContainer: !!relationshipContainer,
            pronounContainer: !!pronounContainer,
            contextInput: !!contextInput,
            genreInput: !!genreInput,
            styleInput: !!styleInput,
            requirementsInput: !!requirementsInput,
            sourceTextInput: !!sourceTextInput,
            googleApiKeyInput: !!googleApiKeyInput
        });
        
        // Tải dữ liệu từ localStorage nếu có
        const savedSettings = localStorage.getItem('dich-ai-settings');
        if (savedSettings) {
            try {
                const jsonData = JSON.parse(savedSettings);
                loadDataFromJson(jsonData);
                console.log("Đã tải cài đặt từ localStorage");
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu từ localStorage:", error);
            }
        }
    }
    
    // If there's no character yet, add an initial one
    if (characterContainer.children.length === 0) {
        addCharacter();
    }
    
    // Functions
    function addCharacter() {
        const newCharacter = characterTemplate.content.cloneNode(true);
        characterContainer.appendChild(newCharacter);
        
        // Add event listener to the remove button
        const removeBtn = characterContainer.querySelector('.character-entry:last-child .remove-btn');
        removeBtn.addEventListener('click', function() {
            this.closest('.character-entry').remove();
            updateCharactersList();
            markAsChanged();
        });
        
        // Add event listener to input for updating characters list
        const nameInput = characterContainer.querySelector('.character-entry:last-child .character-name');
        nameInput.addEventListener('input', function() {
            updateCharactersList();
            markAsChanged();
        });
        
        updateCharactersList();
        markAsChanged();
    }
    
    function addRelationship() {
        const newRelationship = relationshipTemplate.content.cloneNode(true);
        relationshipContainer.appendChild(newRelationship);
        
        // Add event listener to the remove button
        const removeBtn = relationshipContainer.querySelector('.relationship-entry:last-child .remove-btn');
        removeBtn.addEventListener('click', function() {
            this.closest('.relationship-entry').remove();
            markAsChanged();
        });
        
        // Add event listener to input for auto saving
        const descInput = relationshipContainer.querySelector('.relationship-entry:last-child .relationship-description');
        descInput.addEventListener('input', function() {
            markAsChanged();
        });
        
        markAsChanged();
    }
    
    function addPronoun() {
        const newPronoun = pronounTemplate.content.cloneNode(true);
        pronounContainer.appendChild(newPronoun);
        
        // Populate selects with character names
        const fromSelect = pronounContainer.querySelector('.pronoun-entry:last-child .pronoun-from');
        const toSelect = pronounContainer.querySelector('.pronoun-entry:last-child .pronoun-to');
        const valueInput = pronounContainer.querySelector('.pronoun-entry:last-child .pronoun-value');
        const selfValueInput = pronounContainer.querySelector('.pronoun-entry:last-child .self-pronoun-value');
        
        populateCharacterSelect(fromSelect);
        populateCharacterSelect(toSelect);
        
        // Add event listeners for selects to prevent duplicates
        fromSelect.addEventListener('change', function() {
            updateAvailableToCharacters(this.closest('.pronoun-entry'));
            markAsChanged();
        });
        
        toSelect.addEventListener('change', function() {
            // Check if this is a valid combination
            const fromValue = this.closest('.pronoun-entry').querySelector('.pronoun-from').value;
            const toValue = this.value;
            
            if (fromValue === toValue) {
                alert('Không thể thiết lập XƯNG hô với chính mình!');
                this.selectedIndex = 0;
                return;
            }
            
            const pairKey = `${fromValue}-${toValue}`;
            if (existingPronounPairs.has(pairKey) && !this.dataset.originalPair) {
                alert('XƯNG hô giữa hai nhân vật này đã tồn tại!');
                this.selectedIndex = 0;
                return;
            }
            
            markAsChanged();
        });
        
        // Add event listeners for input fields to auto save
        valueInput.addEventListener('input', function() {
            markAsChanged();
        });
        selfValueInput.addEventListener('input', function() {
            markAsChanged();
        });
        
        // Add event listener to the remove button
        const removeBtn = pronounContainer.querySelector('.pronoun-entry:last-child .remove-btn');
        removeBtn.addEventListener('click', function() {
            const entry = this.closest('.pronoun-entry');
            const fromValue = entry.querySelector('.pronoun-from').value;
            const toValue = entry.querySelector('.pronoun-to').value;
            
            // Remove from existing pairs
            existingPronounPairs.delete(`${fromValue}-${toValue}`);
            
            entry.remove();
            updatePronounPairs();
            markAsChanged();
        });
        
        // Trigger initial validation
        updateAvailableToCharacters(pronounContainer.querySelector('.pronoun-entry:last-child'));
        
        // Save after adding
        markAsChanged();
    }
    
    function updateAvailableToCharacters(entryElement) {
        const fromSelect = entryElement.querySelector('.pronoun-from');
        const toSelect = entryElement.querySelector('.pronoun-to');
        const selectedFrom = fromSelect.value;
        
        // Store current selection
        const currentTo = toSelect.value;
        
        // Clear existing options
        toSelect.innerHTML = '';
        
        // Add options excluding the selected "from" character
        characters.forEach(character => {
            // Skip if it's the same character
            if (character === selectedFrom) return;
            
            // Skip if this pair already exists elsewhere
            const pairKey = `${selectedFrom}-${character}`;
            if (existingPronounPairs.has(pairKey) && 
                (!toSelect.dataset.originalPair || 
                 toSelect.dataset.originalPair !== pairKey)) {
                return;
            }
            
            const option = document.createElement('option');
            option.value = character;
            option.textContent = character;
            toSelect.appendChild(option);
        });
        
        // Add empty option at the beginning
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- Chọn nhân vật --';
        toSelect.insertBefore(emptyOption, toSelect.firstChild);
        
        // Restore selection if still available
        if (currentTo && Array.from(toSelect.options).some(opt => opt.value === currentTo)) {
            toSelect.value = currentTo;
        } else {
            toSelect.selectedIndex = 0;
        }
    }
    
    function updateCharactersList() {
        characters = [];
        document.querySelectorAll('.character-name').forEach(input => {
            if (input.value.trim() !== '') {
                characters.push(input.value.trim());
            }
        });
        
        console.log("Character list updated:", characters);
        
        // Update all pronoun selects
        document.querySelectorAll('.pronoun-from').forEach(select => {
            const currentValue = select.value;
            const entryElement = select.closest('.pronoun-entry');
            
            populateCharacterSelect(select);
            select.value = currentValue;
            
            // Update "to" selects based on new character list
            updateAvailableToCharacters(entryElement);
        });
        
        // Update character selects in the table
        updateTableCharacterSelects();
        
        updatePronounPairs();
        markAsChanged();
    }
    
    function updatePronounPairs() {
        // Clear and rebuild existing pairs
        existingPronounPairs.clear();
        
        document.querySelectorAll('.pronoun-entry').forEach(entry => {
            const fromValue = entry.querySelector('.pronoun-from').value;
            const toValue = entry.querySelector('.pronoun-to').value;
            
            if (fromValue && toValue) {
                const pairKey = `${fromValue}-${toValue}`;
                existingPronounPairs.add(pairKey);
                
                // Store original pair for this entry
                entry.querySelector('.pronoun-to').dataset.originalPair = pairKey;
            }
        });
    }
    
    function populateCharacterSelect(select) {
        const currentValue = select.value;
        select.innerHTML = '';
        
        characters.forEach(character => {
            const option = document.createElement('option');
            option.value = character;
            option.textContent = character;
            select.appendChild(option);
        });
        
        // Add empty option at the beginning
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- Chọn nhân vật --';
        select.insertBefore(emptyOption, select.firstChild);
        
        // Restore previous selection if possible
        if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
            select.value = currentValue;
        } else {
            select.selectedIndex = 0;
        }
    }
    
    async function translateText() {
        const originalText = getOriginalText();
        if (!originalText.trim()) {
            displayErrorMessage('Vui lòng nhập văn bản để dịch.');
            return;
        }
        const model = "google/gemini-2.5-pro";
        const apiKey = googleApiKeyInput && googleApiKeyInput.value ? googleApiKeyInput.value : '';
        if (!apiKey) {
            displayErrorMessage('Vui lòng nhập API key của Google AI Studio.');
            return;
        }
        const prompt = buildTranslationPrompt();
        
        // Hiển thị tiến trình
        const progressElement = document.createElement('div');
        progressElement.className = 'translation-progress';
        progressElement.innerHTML = `
            <div class="progress-step step-active">Bước 1: Dịch ban đầu</div>
            <div class="progress-step">Bước 2: Trau chuốt bản dịch</div>
        `;
        translationResult.innerHTML = '';
        translationResult.appendChild(progressElement);

        isLoading = true;
        updateButtonState();

        // Bắt đầu đo thời gian xử lý
        const startTime = new Date();

        // Bước 1: Dịch ban đầu
        callGoogleAPI(apiKey, prompt, createTranslationSystemPrompt())
            .then(response => {
                if (progressElement.parentNode === translationResult) {
                    progressElement.children[0].classList.remove('step-active');
                    progressElement.children[0].classList.add('step-completed');
                    progressElement.children[1].classList.add('step-active');
                }
                
                // Sử dụng hàm stripMarkdownOnly để giữ thông tin nhân vật và biểu hiện
                const initialTranslation = stripMarkdownOnly(response);
                
                // Thay thế "câu cần dịch" thành "câu cần trau chuốt" trong bản trau chuốt 
                const formattedInitialTranslation = initialTranslation.replace(/câu cần dịch:/gi, "câu cần trau chuốt:");
                
                // Bước 2: Trau chuốt bản dịch
                const refinementPrompt = buildRefinementPrompt(formattedInitialTranslation, extractPromptInfo());
                
                return callGoogleAPI(apiKey, refinementPrompt, createTranslationSystemPrompt());
            })
            .then(refinedTranslation => {
                // Tính thời gian xử lý
                const endTime = new Date();
                const processingTime = (endTime - startTime) / 1000; // Đổi sang giây
                
                // Lưu lại kết quả chưa xử lý để xuất với tên nhân vật
                originalRefinedTranslation = refinedTranslation;
                
                // Loại bỏ mọi định dạng Markdown và thông tin nhân vật, biểu hiện ở kết quả cuối cùng
                const finalTranslation = stripMarkdown(refinedTranslation);
                
                translationResult.innerHTML = '';
                translationResult.appendChild(document.createTextNode(finalTranslation));
                
                // Cập nhật các ô bản dịch từ kết quả dịch
                updateTranslationCellsFromResult(originalRefinedTranslation);
                
                // Hiển thị nút trau chuốt lần nữa khi có kết quả dịch
                document.getElementById('refine-again-controls').style.display = 'flex';
                // Hiển thị nút xuất kết quả kèm tên nhân vật
                document.getElementById('export-with-character-controls').style.display = 'flex';
                
                isLoading = false;
                updateButtonState();
                
                // Hiển thị thông báo thành công
                showToast('Đã dịch văn bản thành công!', 'success');
                
                // Gửi thông báo kết quả đến Discord
                if (window.analytics) {
                    window.analytics.ensureIpThenSend({
                        embeds: [{
                            title: '✅ Hoàn thành dịch văn bản',
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
                                    name: 'Trạng thái',
                                    value: 'Hoàn thành'
                                },
                                {
                                    name: 'Model AI',
                                    value: model
                                },
                                {
                                    name: 'Thời gian xử lý',
                                    value: `${processingTime.toFixed(2)} giây`
                                },
                                {
                                    name: 'Độ dài văn bản gốc',
                                    value: `${originalText.length} ký tự`
                                },
                                {
                                    name: 'Độ dài kết quả',
                                    value: `${finalTranslation.length} ký tự`
                                },
                                {
                                    name: 'Xem trước kết quả',
                                    value: finalTranslation.substring(0, 100) + (finalTranslation.length > 100 ? '...' : '')
                                },
                                {
                                    name: 'Thời gian hoàn thành',
                                    value: endTime.toLocaleString('vi-VN')
                                }
                            ],
                            color: 0xF1C40F
                        }]
                    });
                }
            })
            .catch(error => {
                displayErrorMessage('Lỗi dịch văn bản: ' + error.message);
                isLoading = false;
                updateButtonState();
                
                // Gửi thông báo lỗi đến Discord
                if (window.analytics) {
                    window.analytics.ensureIpThenSend({
                        embeds: [{
                            title: '❌ Lỗi dịch văn bản',
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
                                    name: 'Trạng thái',
                                    value: 'Thất bại'
                                },
                                {
                                    name: 'Model AI',
                                    value: model
                                },
                                {
                                    name: 'Lỗi',
                                    value: error.message
                                },
                                {
                                    name: 'Thời gian',
                                    value: new Date().toLocaleString('vi-VN')
                                }
                            ],
                            color: 0xE74C3C
                        }]
                    });
                }
            });
    }
    
    // Hàm trích xuất thông tin từ prompt để sử dụng lại trong bước trau chuốt
    function extractPromptInfo() {
        // Thu thập thông tin về XƯNG hô
        const pronounInfo = [];
        document.querySelectorAll('.pronoun-entry').forEach(entry => {
            const from = entry.querySelector('.pronoun-from').value;
            const to = entry.querySelector('.pronoun-to').value;
            const value = entry.querySelector('.pronoun-value').value;
            const selfValue = entry.querySelector('.self-pronoun-value').value;
            
            if (from && to && value) {
                pronounInfo.push({
                    from: from,
                    to: to,
                    value: value,
                    selfValue: selfValue
                });
            }
        });
        
        // Thu thập thông tin về các dòng "giữ nguyên"
        const keepOriginalLines = [];
        document.querySelectorAll('#text-table-body tr').forEach((row, index) => {
            const expressionSelect = row.querySelector('.expression-select');
            const textCell = row.querySelector('td:nth-child(5)'); // Cột văn bản vẫn là cột thứ 5
            
            const expression = expressionSelect.value;
            const text = textCell.getAttribute('data-original-text');
            
            if (expression === 'Giữ nguyên') {
                keepOriginalLines.push({
                    index: index + 1,
                    text: text
                });
            }
        });
        
        // Thu thập thông tin về mối quan hệ nhân vật
        const relationships = [];
        document.querySelectorAll('.relationship-description').forEach(input => {
            if (input.value.trim() !== '') {
                relationships.push(input.value.trim());
            }
        });
        
        return {
            pronouns: pronounInfo,
            keepOriginalLines: keepOriginalLines,
            relationships: relationships,
            genre: genreInput.value.trim(),
            style: styleInput.value.trim()
        };
    }
    
    // Hàm tạo prompt cho việc trau chuốt bản dịch
    function buildRefinementPrompt(firstTranslation, promptInfo) {
        let prompt = "Dưới đây là bản dịch của một văn bản. Hãy trau chuốt lại bản dịch này để có văn phong ổn hơn, hay hơn, mượt như đối thoại ngoài đời, nhưng không được thêm bớt, phải đúng ý nghĩa câu văn và PHẢI GIỮ NGUYÊN XƯNG HÔ theo yêu cầu. LƯU Ý: VIỆC GIỮ NGUYÊN XƯNG HÔ LÀ QUAN TRỌNG NHẤT, KHÔNG ĐƯỢC THAY ĐỔI DƯỚI BẤT KỲ HÌNH THỨC NÀO.\n\n";
        
        prompt += "XƯNG HÔ GIỮA CÁC NHÂN VẬT (PHẢI TUÂN THEO NGHIÊM NGẶT - ĐÂY LÀ YÊU CẦU QUAN TRỌNG NHẤT):\n";
        promptInfo.pronouns.forEach(item => {
            prompt += `- ${item.from}: gọi ${item.to} là "${item.value}"`;
            if (item.selfValue) {
                prompt += `, XƯNG bản thân là "${item.selfValue}"`;
            }
            prompt += '\n';
        });
        
        if (promptInfo.relationships.length > 0) {
            prompt += "\nMỐI QUAN HỆ GIỮA CÁC NHÂN VẬT:\n";
            promptInfo.relationships.forEach(rel => {
                prompt += `- ${rel}\n`;
            });
        }
        
        prompt += "\nYÊU CẦU BẮT BUỘC PHẢI TUÂN THỦ:\n";
        prompt += "- Trau chuốt văn phong để ổn hơn\n";
        prompt += "- PHẢI GIỮ NGUYÊN TẤT CẢ XƯNG HÔ giữa các nhân vật như đã chỉ định ở trên - ĐÂY LÀ YÊU CẦU QUAN TRỌNG NHẤT\n";
        prompt += "- Giữ nguyên cấu trúc đoạn văn và phân đoạn\n";
        prompt += "- Không sử dụng Markdown, trả về văn bản thuần túy\n";
        prompt += "- Không thêm bất kỳ thông tin mới nào\n";
        prompt += "- VÔ CÙNG QUAN TRỌNG: PHẢI GIỮ NGUYÊN định dạng đầu vào 'Nhân vật: X, Biểu hiện/dạng thoại: Y, câu cần trau chuốt: Z' (bao gồm cả phần 'đang nói với: W' nếu có) ở mỗi dòng trong QUÁ TRÌNH trau chuốt, nhưng KHÔNG đưa thông tin này vào kết quả cuối cùng\n";
        
        // Thêm văn phong nếu có
        if (promptInfo.style) {
            prompt += `- Áp dụng văn phong: ${promptInfo.style}\n`;
        }
        
        // Thêm thể loại nếu có
        if (promptInfo.genre) {
            prompt += `- Phù hợp với thể loại: ${promptInfo.genre}\n`;
        }
        
        // Thêm thông tin về các dòng cần giữ nguyên
        if (promptInfo.keepOriginalLines.length > 0) {
            prompt += "\nCÁC DÒNG VĂN BẢN CẦN GIỮ NGUYÊN (KHÔNG ĐƯỢC THAY ĐỔI):\n";
            promptInfo.keepOriginalLines.forEach(line => {
                prompt += `Dòng ${line.index}: ${line.text}\n`;
            });
            prompt += "Những dòng trên PHẢI được giữ nguyên trong bản dịch cuối cùng, KHÔNG ĐƯỢC DỊCH các dòng này.\n";
        }
        
        prompt += "\nBẢN DỊCH CẦN TRAU CHUỐT:\n\n";
        prompt += firstTranslation;
        
        prompt += "\n\nCÁCH TRẢ LỜI YÊU CẦU: Sau khi trau chuốt, hãy chỉ trả về kết quả trau chuốt THEO ĐÚNG ĐỊNH DẠNG CHUẨN SAU:\n";
        prompt += "1. Mỗi dòng phải bắt đầu với 'Nhân vật: X, Biểu hiện/dạng thoại: Y, câu cần trau chuốt: Z' (bao gồm cả phần 'đang nói với: W' nếu có)\n";
        prompt += "2. TUYỆT ĐỐI KHÔNG thêm mô tả, giải thích hoặc bất kỳ phần giới thiệu/kết luận nào\n";
        prompt += "3. Không thêm bất kỳ định dạng Markdown nào\n";
        prompt += "4. Trả về kết quả dưới dạng văn bản thuần (plain text)\n\n";
        
        prompt += "NHẮC LẠI CÁC QUY TẮC TRAU CHUỐT (ĐỌC KỸ VÀ TUÂN THỦ):\n";
        prompt += "1. PHẢI giữ nguyên cấu trúc đoạn văn và phân đoạn\n";
        prompt += "2. PHẢI sử dụng CHÍNH XÁC XƯNG hô giữa các nhân vật như đã chỉ định ở trên - ĐÂY LÀ QUAN TRỌNG NHẤT\n";
        prompt += "3. PHẢI giữ nguyên những dòng đã được chỉ định là 'giữ nguyên'\n";
        prompt += "4. PHẢI giữ nguyên định dạng 'Nhân vật: X, Biểu hiện/dạng thoại: Y, câu cần trau chuốt: Z' (bao gồm cả phần 'đang nói với: W' nếu có) ở mỗi dòng trong kết quả trau chuốt\n";
        prompt += "5. KHÔNG được thêm phần giới thiệu hoặc kết luận nào vào kết quả";
        
        return prompt;
    }
    
    // Hàm chỉ bỏ định dạng Markdown, giữ nguyên thông tin nhân vật và biểu hiện
    function stripMarkdownOnly(text) {
        if (!text) return '';
        
        // Chỉ bỏ các dấu hiệu định dạng phổ biến của Markdown
        text = text
            // Bỏ các tiêu đề
            .replace(/^#+\s+/gm, '')
            // Bỏ định dạng in đậm
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/__(.*?)__/g, '$1')
            // Bỏ định dạng in nghiêng
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/_(.*?)_/g, '$1')
            // Bỏ định dạng blockquote
            .replace(/^>\s+/gm, '')
            // Bỏ định dạng danh sách
            .replace(/^[\*\-+]\s+/gm, '')
            .replace(/^\d+\.\s+/gm, '')
            // Bỏ backticks cho code
            .replace(/`([^`]+)`/g, '$1')
            .replace(/```[\s\S]*?```/g, '')
            // Bỏ đường kẻ ngang
            .replace(/^[\-=_]{3,}\s*$/gm, '')
            // Bỏ liên kết
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
            // Bỏ hình ảnh
            .replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '');
            
        return text;
    }
    
    // Hàm bỏ định dạng Markdown và thông tin nhân vật/biểu hiện trong văn bản
    function stripMarkdown(text) {
        if (!text) return '';
        
        // Loại bỏ các phần thông tin về nhân vật, biểu hiện và câu cần trau chuốt
        text = text
            // Loại bỏ cả dòng nếu nó bắt đầu với "Nhân vật:" và kết thúc với "câu cần trau chuốt:"
            .replace(/Nhân vật:.*?Biểu hiện\/dạng thoại:.*?câu cần trau chuốt:[\s]*/gi, '')
            // Thêm pattern để xử lý định dạng có "đang nói với ai"
            .replace(/Nhân vật:.*?đang nói với:.*?Biểu hiện\/dạng thoại:.*?câu cần trau chuốt:[\s]*/gi, '')
            // Loại bỏ từng phần riêng lẻ để đảm bảo xử lý triệt để
            .replace(/Nhân vật:[\s\S]*?(,\s+|,)/gi, '')
            .replace(/đang nói với:[\s\S]*?(,\s+|,)/gi, '') 
            .replace(/Biểu hiện\/dạng thoại:[\s\S]*?(,\s+|,)/gi, '')
            .replace(/[cC]âu cần (dịch|trau chuốt):[\s]*/gi, '');
        
        // Bỏ các dấu hiệu định dạng phổ biến của Markdown
        text = text
            // Bỏ các tiêu đề
            .replace(/^#+\s+/gm, '')
            // Bỏ định dạng in đậm
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/__(.*?)__/g, '$1')
            // Bỏ định dạng in nghiêng
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/_(.*?)_/g, '$1')
            // Bỏ định dạng blockquote
            .replace(/^>\s+/gm, '')
            // Bỏ định dạng danh sách
            .replace(/^[\*\-+]\s+/gm, '')
            .replace(/^\d+\.\s+/gm, '')
            // Bỏ backticks cho code
            .replace(/`([^`]+)`/g, '$1')
            .replace(/```[\s\S]*?```/g, '')
            // Bỏ đường kẻ ngang
            .replace(/^[\-=_]{3,}\s*$/gm, '')
            // Bỏ liên kết
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
            // Bỏ hình ảnh
            .replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '');
            
        // Loại bỏ dòng trống dư thừa
        text = text
            .replace(/\n{3,}/g, '\n\n') // Thay thế 3+ dòng trống thành 2 dòng
            .trim();
            
        return text;
    }
    
    function buildTranslationPrompt() {
        let prompt = "Bạn là một dịch giả chuyên nghiệp, đã có hơn 20 năm kinh nghiệm trong lĩnh vực dịch truyện, và còn là 1 tiểu thuyết gia, nhà nghiên cứu văn học, nhà ngôn ngữ học có kinh nghiệm hơn 20 năm trong nghề, giờ hãy dịch chương truyện sau từ ngôn ngữ gốc sang tiếng Việt. LƯU Ý QUAN TRỌNG: Bắt buộc PHẢI giữ nguyên tất cả XƯNG hô, bắt buộc PHẢI tuân thủ các yêu cầu và văn phong và các lưu ý quan trọng.\n\n";
        
        // Add character pronouns
        prompt += "XƯNG HÔ GIỮA CÁC NHÂN VẬT (phải tuân theo nghiêm ngặt):\n";
        document.querySelectorAll('.pronoun-entry').forEach(entry => {
            const from = entry.querySelector('.pronoun-from').value;
            const to = entry.querySelector('.pronoun-to').value;
            const value = entry.querySelector('.pronoun-value').value;
            const selfValue = entry.querySelector('.self-pronoun-value').value;
            
            if (from && to && value) {
                prompt += `- ${from}: gọi ${to} là "${value}"`;
                
                if (selfValue) {
                    prompt += `, XƯNG bản thân là "${selfValue}"`;
                }
                
                prompt += '\n';
            }
        });
        
        // Add thể loại if provided
        if (genreInput.value.trim()) {
            prompt += `\nThể loại: ${genreInput.value.trim()}\n`;
        }
        
        // Add văn phong if provided
        if (styleInput.value.trim()) {
            prompt += `\nVăn phong: ${styleInput.value.trim()}\n`;
        }
        
        // Add relationships
        prompt += "\nMỐI QUAN HỆ GIỮA CÁC NHÂN VẬT:\n";
        document.querySelectorAll('.relationship-description').forEach(input => {
            if (input.value.trim() !== '') {
                prompt += `- ${input.value.trim()}\n`;
            }
        });
        
        // Add context
        if (contextInput.value.trim() !== '') {
            prompt += "\nBỐI CẢNH:\n" + contextInput.value.trim() + "\n";
        }
        
        // Add translation instructions
        prompt += "\nYÊU CẦU BẮT BUỘC PHẢI TUÂN THỦ:\n";
        prompt += "- " + requirementsInput.value.trim() + "\n";
        prompt += "- PHẢI DỊCH một cách tự nhiên, mạch lạc, chính xác, phù hợp với văn phong đối thoại và tường thuật trong truyện tranh hiện đại, TRÁNH LỖI LẶP TỪ HOÀN TOÀN, bao gồm:\n";
        prompt += "* Kiểm tra kỹ từng câu để tránh sử dụng từ hoặc cụm từ giống nhau lặp lại không cần thiết.\n";
        prompt += "* Sử dụng từ đồng nghĩa hợp lý để tránh trùng lặp trong những dòng gần nhau.\n";
        prompt += "* Dùng đa dạng cấu trúc câu để tránh lặp về mặt ngữ pháp.\n";
        prompt += "* Không được Lặp từ giữa hai câu gần nhau.\n";
        prompt += "* Không được Lặp từ trong cùng một câu.\n";
        prompt += "- Dịch chính xác, giữ nguyên tất cả XƯNG hô của các nhân vật như đã chỉ định ở trên\n";
        prompt += "- Giữ nguyên cấu trúc đoạn văn và phân đoạn như văn bản gốc\n";
        prompt += "- Không sử dụng Markdown, trả về văn bản thuần túy\n";
        prompt += "- Phải đúng chính tả, không được nhầm sang ngôn ngữ khác\n";
        prompt += "- Nếu một dòng có Biểu hiện/dạng thoại là \"giữ nguyên\", KHÔNG DỊCH dòng đó, giữ nguyên văn bản gốc\n";
        prompt += "- Sau khi dịch xong, hãy tự đọc lại từ đến cuối bản dịch 1 lần nữa rồi tự dịch lại sao cho chuẩn và mượt mà nhất, sau đó mới trả lại kết quả, ĐÂY LÀ ĐIỀU BẮT BUỘC PHẢI LÀM.\n";

        prompt += "- VÔ CÙNG QUAN TRỌNG: PHẢI GIỮ NGUYÊN các phần 'Nhân vật:' và 'Biểu hiện/dạng thoại:' trong kết quả dịch CHÍNH XÁC như định dạng đầu vào: 'Nhân vật: X, Biểu hiện/dạng thoại: Y, câu cần dịch: Z' (bao gồm cả phần 'đang nói với: W' nếu có)\n";
        
        prompt += "\nXỬ LÝ LỖI LẶP TỪ HOÀN TOÀN NHƯ SAU:\n\n";
        prompt += `1. Nếu hai câu gần nhau bị lặp từ (ví dụ "ông ta"):\nThay thế từ bị lặp bằng đại từ phù hợp hoặc miêu tả gián tiếp\nVí dụ:\nSai (lặp từ):\nÔng ta đang lảm nhảm điều gì vậy?\nÔng ta điên rồi...\n\nĐúng (loại bỏ lặp từ):\n\nÔng ta đang lảm nhảm điều gì vậy?\nĐúng là điên rồi...\n`;
        prompt += `\n2. Nếu một câu lặp một từ quá nhiều lần (ví dụ "tôi"):\nBiến đổi cấu trúc câu hoặc thay thế từ bằng cách rút gọn hợp lý\nVí dụ:\nSai (lặp từ quá nhiều):\nTôi không muốn gia đình phát hiện ra việc tôi đang tìm kiếm Haru... ý tôi là... Nagi.\n\nĐúng (loại bỏ lặp từ):\n\nTôi không muốn gia đình biết chuyện mình đang tìm kiếm Haru... ý là... Nagi.\n`;

        // Add text lines with character and expression information
        prompt += "\nVĂN BẢN CẦN DỊCH:\n\n";
        
        // Get all rows from the table
        const rows = document.querySelectorAll('#text-table-body tr');
        
        if (rows.length > 0) {
            rows.forEach((row, index) => {
                const characterSelect = row.querySelector('.character-select');
                const talkingToSelect = row.querySelector('.talking-to-select');
                const expressionSelect = row.querySelector('.expression-select');
                const textCell = row.querySelector('td:nth-child(5)'); // Cột văn bản vẫn là cột thứ 5
                
                const character = characterSelect.value !== 'none' ? characterSelect.value : '';
                const talkingTo = talkingToSelect.value !== 'none' ? talkingToSelect.value : '';
                const expression = expressionSelect.value !== 'none' ? expressionSelect.value : '';
                const text = textCell.getAttribute('data-original-text');
                
                // Định dạng câu theo yêu cầu
                let line = '';
                
                // Thêm thông tin nhân vật nếu có
                if (character) {
                    line += `Nhân vật: ${character}, `;
                    
                    // Thêm thông tin "đang nói với ai" nếu có và không phải chính nhân vật đó
                    if (talkingTo && character !== talkingTo) {
                        line += `đang nói với: ${talkingTo}, `;
                    }
                }
                
                // Thêm thông tin biểu hiện nếu có
                if (expression) {
                    line += `Biểu hiện/dạng thoại: ${expression}, `;
                }
                
                // Thêm câu cần dịch
                line += `câu cần dịch: ${text}`;
                
                prompt += line + '\n';
            });
        } else {
            // Fallback to source text if no table rows
            prompt += sourceTextInput.value.trim();
        }
        
        // Final reminder about pronouns and formatting
        prompt += "\n\nNHẮC LẠI CÁC YÊU CẦU QUAN TRỌNG (PHẢI TUÂN THỦ):\n";
        prompt += "1. PHẢI giữ nguyên cấu trúc đoạn văn và phân đoạn\n";
        prompt += "2. BẮT BUỘC PHẢI sử dụng chính xác XƯNG hô giữa các nhân vật như đã chỉ định ở trên. Tuyệt đối không thay đổi.\n";
        prompt += "3. BẮT BUỘC PHẢI giữ nguyên những dòng có Biểu hiện/dạng thoại là \"giữ nguyên\"\n";
        prompt += "4. PHẢI GIỮ NGUYÊN định dạng đầu vào 'Nhân vật: X, Biểu hiện/dạng thoại: Y, câu cần dịch: Z' ở mỗi dòng trong kết quả dịch (bao gồm cả phần 'đang nói với: W' nếu có)\n";
        prompt += "5. Dịch thật chính xác, mượt mà, đúng văn phong ở phần Yêu cầu, đúng cảm xúc, tránh lỗi lặp từ\n";
        prompt += "6. CHÚ Ý thông tin 'đang nói với ai' để định hướng ngữ cảnh và phù hợp với giao tiếp trong câu thoại\n";
        
        return prompt;
    }
    
    // Các hàm liên quan đến lưu và tải cài đặt
    function saveSettings() {
        try {
            const data = collectAllData();
            localStorage.setItem('translationAppSettings', JSON.stringify(data));
            showToast('Đã lưu cài đặt thành công!', 'success');
        } catch (error) {
            console.error("Lỗi khi lưu cài đặt:", error);
            showToast('Lỗi khi lưu cài đặt!', 'error');
        }
    }
    
    function loadSettings() {
        try {
            const savedData = localStorage.getItem('translationAppSettings');
            if (!savedData) {
                showToast('Không tìm thấy cài đặt đã lưu!', 'warning');
                return;
            }
            
            const data = JSON.parse(savedData);
            loadDataFromJson(data);
            showToast('Đã tải cài đặt thành công!', 'success');
        } catch (error) {
            console.error("Lỗi khi tải cài đặt:", error);
            showToast('Lỗi khi tải cài đặt!', 'error');
        }
    }
    
    function exportToJson() {
        try {
            // Thu thập tất cả dữ liệu
            const settingsData = collectAllData();
            
            // Chuyển đổi thành chuỗi JSON
            const jsonString = JSON.stringify(settingsData, null, 2);
            
            // Tạo Blob từ chuỗi JSON
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // Tạo URL cho Blob
            const url = URL.createObjectURL(blob);
            
            // Tạo phần tử a để tải xuống
            const a = document.createElement('a');
            a.href = url;
            a.download = 'dich-ai-settings.json';
            document.body.appendChild(a);
            a.click();
            
            // Dọn dẹp
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
            
            console.log("Đã tải file cài đặt thành công");
        } catch (error) {
            console.error("Lỗi khi tải file cài đặt:", error);
            showToast("Có lỗi khi tải file cài đặt: " + error.message, 'error');
        }
    }
    
    // Hàm xuất kết quả dịch kèm tên nhân vật
    function exportWithCharacterNames() {
        try {
            // Kiểm tra xem có kết quả dịch ban đầu không
            if (!originalRefinedTranslation) {
                showToast('Không có kết quả dịch để xuất', 'warning');
                return;
            }
            
            // Lấy danh sách nhân vật đã cấu hình
            const configuredCharacters = [];
            document.querySelectorAll('.character-entry .character-name').forEach(input => {
                if (input.value.trim() !== '') {
                    configuredCharacters.push(input.value.trim());
                }
            });
            
            // Mảng lưu kết quả đã định dạng
            let formattedLines = [];
            
            // Tách các dòng từ kết quả gốc
            const lines = originalRefinedTranslation.split('\n');
            
            // Lấy tên nhân vật cuối cùng được sử dụng (cho các dòng không có nhân vật)
            let lastCharacter = configuredCharacters.length > 0 ? configuredCharacters[0] : '';
            
            // Xử lý từng dòng
            lines.forEach((line, index) => {
                line = line.trim();
                if (!line) return;
                
                // Regex để trích xuất tên nhân vật nếu có định dạng chuẩn
                const characterRegex = /^Nhân vật:\s*([^,:.]+?)(?:,|$)/i;
                const characterMatch = line.match(characterRegex);
                
                // Biến để lưu tên nhân vật và câu văn
                let character = '';
                let sentence = '';
                
                // Nếu tìm thấy tên nhân vật rõ ràng
                if (characterMatch && characterMatch[1] && characterMatch[1].trim() !== 'Nhân vật') {
                    character = characterMatch[1].trim();
                    // Cập nhật nhân vật cuối cùng
                    lastCharacter = character;
                    
                    // Tìm câu văn từ line sau khi loại bỏ các thành phần không cần thiết
                    sentence = extractSentenceFromLine(line);
                    
                    // Thêm vào kết quả
                    formattedLines.push(character + ': ' + sentence);
                }
                // Nếu dòng bắt đầu với "Nhân vật:" nhưng không có tên nhân vật rõ ràng
                else if (line.startsWith('Nhân vật:')) {
                    // Trích xuất câu văn
                    sentence = extractSentenceFromLine(line);
                    
                    // Tìm nhân vật từ các dòng trước đó
                    if (lastCharacter) {
                        formattedLines.push(lastCharacter + ': ' + sentence);
                    } else {
                        // Nếu không có nhân vật, chỉ giữ câu văn
                        formattedLines.push(sentence);
                    }
                }
                // Nếu dòng bắt đầu với "Biểu hiện/dạng thoại:" hoặc "Trạng thái:"
                else if (line.startsWith('Biểu hiện/dạng thoại:') || line.startsWith('Trạng thái:')) {
                    // Trích xuất câu văn sau các phần không cần thiết
                    sentence = extractSentenceFromLine(line);
                    
                    // Thêm vào kết quả không kèm nhân vật
                    formattedLines.push(sentence);
                }
                // Các dòng khác
                else {
                    formattedLines.push(line);
                }
            });
            
            // Loại bỏ các dòng trống hoặc không hợp lệ
            formattedLines = formattedLines.filter(line => line && line.trim());
            
            // Nối các dòng thành một chuỗi
            const formattedContent = formattedLines.join('\n');
            
            // Tạo Blob từ chuỗi
            const blob = new Blob([formattedContent], { type: 'text/plain;charset=utf-8' });
            
            // Tạo URL cho Blob
            const url = URL.createObjectURL(blob);
            
            // Tạo phần tử a để tải xuống
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ket-qua-dich-voi-nhan-vat.txt';
            document.body.appendChild(a);
            a.click();
            
            // Dọn dẹp
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
            
            showToast('Đã xuất kết quả dịch kèm tên nhân vật thành công!', 'success');
        } catch (error) {
            console.error('Lỗi khi xuất kết quả dịch:', error);
            showToast('Có lỗi khi xuất kết quả dịch: ' + error.message, 'error');
        }
    }
    
    // Hàm hỗ trợ để trích xuất câu văn từ một dòng
    function extractSentenceFromLine(line) {
        // Loại bỏ phần "Nhân vật:" nếu có
        if (line.startsWith('Nhân vật:')) {
            line = line.substring('Nhân vật:'.length).trim();
        }
        
        // Danh sách các mẫu cần loại bỏ
        const patternsToRemove = [
            /^[^,:.]+?(?:,|$)/i,  // Tên nhân vật đầu dòng kèm dấu phẩy
            /đang nói với:[^,:.]+?(?:,|$)/i,  // "đang nói với: X,"
            /Biểu hiện\/dạng thoại:[^,:.]+?(?:,|$)/i,  // "Biểu hiện/dạng thoại: X,"
            /Trạng thái:[^,:.]+?(?:,|$)/i,  // "Trạng thái: X,"
            /câu cần trau chuốt:\s*/i,  // "câu cần trau chuốt:"
            /câu cần dịch:\s*/i  // "câu cần dịch:"
        ];
        
        // Áp dụng các mẫu để loại bỏ
        for (const pattern of patternsToRemove) {
            line = line.replace(pattern, '');
        }
        
        return line.trim();
    }
    
    // Chức năng nhập dữ liệu từ file cài đặt
    function importFromJson(event) {
        try {
            const file = event.target.files[0];
            if (!file) {
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    loadDataFromJson(jsonData);
                    console.log("Đã nhập cài đặt từ file thành công");
                    showToast("Đã nhập cài đặt từ file thành công!", 'success');
                } catch (parseError) {
                    console.error("Lỗi khi phân tích file cài đặt:", parseError);
                    showToast("File cài đặt không hợp lệ: " + parseError.message, 'error');
                }
            };
            
            reader.readAsText(file);
            
            // Reset input để có thể chọn lại cùng một file
            event.target.value = "";
        } catch (error) {
            console.error("Lỗi khi đọc file cài đặt:", error);
            showToast("Có lỗi khi đọc file cài đặt: " + error.message, 'error');
        }
    }
    
    // Thu thập tất cả dữ liệu để lưu
    function collectAllData() {
        // Thu thập dữ liệu nhân vật
        const characters = [];
        document.querySelectorAll('.character-entry .character-name').forEach(input => {
            if (input.value.trim() !== '') {
                characters.push(input.value.trim());
            }
        });
        
        // Thu thập dữ liệu mối quan hệ
        const relationships = [];
        document.querySelectorAll('.relationship-entry .relationship-description').forEach(input => {
            if (input.value.trim() !== '') {
                relationships.push(input.value.trim());
            }
        });
        
        // Thu thập dữ liệu XƯNG hô
        const pronouns = [];
        document.querySelectorAll('.pronoun-entry').forEach(entry => {
            const from = entry.querySelector('.pronoun-from').value;
            const to = entry.querySelector('.pronoun-to').value;
            const value = entry.querySelector('.pronoun-value').value;
            const selfValue = entry.querySelector('.self-pronoun-value').value;
            
            if (from && to && value && from !== 'none' && to !== 'none') {
                pronouns.push({
                    from: from,
                    to: to,
                    value: value,
                    selfValue: selfValue
                });
            }
        });
        
        // Thu thập dữ liệu biểu hiện
        const expressions = [];
        document.querySelectorAll('.expression-entry .expression-value').forEach(input => {
            if (input.value.trim() !== '') {
                expressions.push(input.value.trim());
            }
        });
        
        // Thu thập dữ liệu từ bảng văn bản
        const textTableData = [];
        document.querySelectorAll('#text-table-body tr').forEach(row => {
            const characterSelect = row.querySelector('.character-select');
            const talkingToSelect = row.querySelector('.talking-to-select');
            const expressionSelect = row.querySelector('.expression-select');
            const textCell = row.querySelector('td:nth-child(5)');
            const translationCell = row.querySelector('.translation-cell');
            
            if (textCell) {
                textTableData.push({
                    character: characterSelect ? characterSelect.value : 'none',
                    talkingTo: talkingToSelect ? talkingToSelect.value : 'none',
                    expression: expressionSelect ? expressionSelect.value : 'none',
                    text: textCell.getAttribute('data-original-text') || textCell.textContent,
                    translation: translationCell ? (translationCell.getAttribute('data-translation') || '') : ''
                });
            }
        });
        
        // Thu thập các cài đặt khác
        const context = contextInput.value.trim();
        const genre = genreInput.value.trim();
        const style = styleInput.value.trim();
        const requirements = requirementsInput.value.trim();
        const sourceText = sourceTextInput.value.trim();
        const googleApiKey = document.getElementById('google-api-key').value;
        
        // Tạo đối tượng dữ liệu
        const data = {
            // Tên trường mới (phiên bản 1.3)
            characters: characters,
            relationships: relationships,
            pronouns: pronouns,
            expressions: expressions,
            textTableData: textTableData,
            context: context,
            genre: genre,
            style: style,
            requirements: requirements,
            sourceText: sourceText,
            googleApiKey: googleApiKey,
            version: '1.4' // Cập nhật phiên bản để hỗ trợ cột bản dịch
        };
        
        return data;
    }
    
    // Tải dữ liệu từ JSON vào ứng dụng
    function loadDataFromJson(jsonData) {
        try {
            // Xóa sạch dữ liệu hiện tại
            characterContainer.innerHTML = '';
            relationshipContainer.innerHTML = '';
            pronounContainer.innerHTML = '';
            expressionsContainer.innerHTML = '';
            textTableBody.innerHTML = '';
            textLines = [];
            
            // Tải dữ liệu nhân vật
            if (jsonData.characters && Array.isArray(jsonData.characters)) {
                jsonData.characters.forEach(character => {
                    addCharacter();
                    const lastEntry = characterContainer.querySelector('.character-entry:last-child .character-name');
                    if (lastEntry) {
                        lastEntry.value = character;
                    }
                });
            }
            
            // Tải dữ liệu mối quan hệ
            if (jsonData.relationships && Array.isArray(jsonData.relationships)) {
                jsonData.relationships.forEach(relationship => {
                    addRelationship();
                    const lastEntry = relationshipContainer.querySelector('.relationship-entry:last-child .relationship-description');
                    if (lastEntry) {
                        lastEntry.value = relationship;
                    }
                });
            }
            
            // Cập nhật danh sách nhân vật trước khi tải XƯNG hô
            updateCharactersList();
            
            // Tải dữ liệu XƯNG hô
            if (jsonData.pronouns && Array.isArray(jsonData.pronouns)) {
                jsonData.pronouns.forEach(pronoun => {
                    if (pronoun.from && pronoun.to && pronoun.value) {
                        addPronounWithData(pronoun.from, pronoun.to, pronoun.value, pronoun.selfValue || '');
                    }
                });
            }
            
            // Tải dữ liệu biểu hiện
            if (jsonData.expressions && Array.isArray(jsonData.expressions)) {
                jsonData.expressions.forEach(expression => {
                    addExpression();
                    const lastEntry = expressionsContainer.querySelector('.expression-entry:last-child .expression-value');
                    if (lastEntry) {
                        lastEntry.value = expression;
                    }
                });
            }
            
            // Cập nhật danh sách biểu hiện
            updateExpressionsData();
            
            // Tải dữ liệu từ bảng văn bản
            // Kiểm tra phiên bản mới trước (textTableData), nếu không có thì dùng phiên bản cũ (textTable)
            let tableDataSource = jsonData.textTableData || jsonData.textTable;
            
            if (tableDataSource && Array.isArray(tableDataSource)) {
                tableDataSource.forEach(rowData => {
                    // Tạo dòng mới
                    textLines.push(rowData.text);
                });
                
                // Tạo bảng
                createTextTable(textLines);
                
                // Cập nhật dữ liệu cho từng dòng
                const rows = document.querySelectorAll('#text-table-body tr');
                tableDataSource.forEach((rowData, index) => {
                    if (index < rows.length) {
                        const row = rows[index];
                        const characterSelect = row.querySelector('.character-select');
                        const talkingToSelect = row.querySelector('.talking-to-select');
                        const expressionSelect = row.querySelector('.expression-select');
                        const translationCell = row.querySelector('.translation-cell');
                        
                        if (characterSelect && rowData.character) {
                            characterSelect.value = rowData.character;
                            
                            // Trigger change event để cập nhật talkingTo select
                            const event = new Event('change');
                            characterSelect.dispatchEvent(event);
                        }
                        
                        // Chỉ cập nhật talkingTo nếu dữ liệu có (phiên bản 1.3)
                        if (talkingToSelect && rowData.talkingTo) {
                            // Cần đảm bảo rằng giá trị talkingTo không phải là giá trị của character
                            const characterValue = characterSelect ? characterSelect.value : 'none';
                            if (rowData.talkingTo !== characterValue) {
                                talkingToSelect.value = rowData.talkingTo;
                            }
                        }
                        
                        if (expressionSelect && rowData.expression) {
                            expressionSelect.value = rowData.expression;
                        }
                        
                        // Tải dữ liệu bản dịch nếu có
                        if (translationCell && rowData.translation) {
                            translationCell.setAttribute('data-translation', rowData.translation);
                            
                            // Hiển thị bản dịch (truncate nếu quá dài)
                            const displayText = rowData.translation.length > 100 ? 
                                rowData.translation.substring(0, 100) + '...' : rowData.translation;
                            
                            // Giữ lại nút dịch lại
                            const buttonContainer = translationCell.querySelector('.translate-row-container');
                            translationCell.textContent = displayText;
                            if (buttonContainer) {
                                translationCell.appendChild(buttonContainer);
                            }
                        }
                    }
                });
            }
            
            // Tải các cài đặt khác
            if (jsonData.context !== undefined) contextInput.value = jsonData.context;
            if (jsonData.genre !== undefined) genreInput.value = jsonData.genre;
            if (jsonData.style !== undefined) styleInput.value = jsonData.style;
            if (jsonData.requirements !== undefined) requirementsInput.value = jsonData.requirements;
            if (jsonData.sourceText !== undefined) sourceTextInput.value = jsonData.sourceText;
            
            // Tải API key Google
            const googleKey = jsonData.googleApiKey;
            if (googleKey !== undefined) document.getElementById('google-api-key').value = googleKey;
            
            // Đánh dấu là đã thay đổi
            hasUnsavedChanges = true;
            
            // Cập nhật kết quả dịch tổng hợp nếu có bản dịch trong các ô
            updateFinalTranslationResult();
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu từ JSON:", error);
            showToast('Lỗi khi tải dữ liệu: ' + error.message, 'error');
        }
    }
    
    function addPronounWithData(from, to, value, selfValue) {
        const newPronoun = pronounTemplate.content.cloneNode(true);
        pronounContainer.appendChild(newPronoun);
        
        const fromSelect = pronounContainer.querySelector('.pronoun-entry:last-child .pronoun-from');
        const toSelect = pronounContainer.querySelector('.pronoun-entry:last-child .pronoun-to');
        const valueInput = pronounContainer.querySelector('.pronoun-entry:last-child .pronoun-value');
        const selfValueInput = pronounContainer.querySelector('.pronoun-entry:last-child .self-pronoun-value');
        
        populateCharacterSelect(fromSelect);
        populateCharacterSelect(toSelect);
        
        // Đặt giá trị
        fromSelect.value = from;
        toSelect.value = to;
        valueInput.value = value;
        selfValueInput.value = selfValue;
        
        // Lưu cặp gốc
        const pairKey = `${from}-${to}`;
        toSelect.dataset.originalPair = pairKey;
        existingPronounPairs.add(pairKey);
        
        // Add event listeners
        fromSelect.addEventListener('change', function() {
            // Xóa cặp gốc khỏi danh sách hiện có
            const originalPair = toSelect.dataset.originalPair;
            if (originalPair) {
                existingPronounPairs.delete(originalPair);
                delete toSelect.dataset.originalPair;
            }
            
            updateAvailableToCharacters(this.closest('.pronoun-entry'));
            markAsChanged();
        });
        
        toSelect.addEventListener('change', function() {
            // Xóa cặp gốc khỏi danh sách hiện có
            const originalPair = this.dataset.originalPair;
            if (originalPair) {
                existingPronounPairs.delete(originalPair);
                delete this.dataset.originalPair;
            }
            
            // Kiểm tra tính hợp lệ
            const fromValue = this.closest('.pronoun-entry').querySelector('.pronoun-from').value;
            const toValue = this.value;
            
            if (fromValue === toValue) {
                alert('Không thể thiết lập XƯNG hô với chính mình!');
                this.selectedIndex = 0;
                return;
            }
            
            const pairKey = `${fromValue}-${toValue}`;
            if (existingPronounPairs.has(pairKey)) {
                alert('XƯNG hô giữa hai nhân vật này đã tồn tại!');
                this.selectedIndex = 0;
                return;
            }
            
            // Thêm cặp mới
            if (fromValue && toValue) {
                existingPronounPairs.add(pairKey);
                this.dataset.originalPair = pairKey;
            }
            
            markAsChanged();
        });
        
        // Value input listeners
        valueInput.addEventListener('change', markAsChanged);
        selfValueInput.addEventListener('change', markAsChanged);
        
        // Remove button
        const removeBtn = pronounContainer.querySelector('.pronoun-entry:last-child .remove-btn');
        removeBtn.addEventListener('click', function() {
            const entry = this.closest('.pronoun-entry');
            const fromValue = entry.querySelector('.pronoun-from').value;
            const toValue = entry.querySelector('.pronoun-to').value;
            
            // Remove from existing pairs
            existingPronounPairs.delete(`${fromValue}-${toValue}`);
            
            entry.remove();
            updatePronounPairs();
            markAsChanged();
        });
    }
    
    function addExpression() {
        const newExpression = expressionTemplate.content.cloneNode(true);
        expressionsContainer.appendChild(newExpression);
        
        // Add event listener to the remove button
        const removeBtn = expressionsContainer.querySelector('.expression-entry:last-child .remove-btn');
        removeBtn.addEventListener('click', function() {
            this.closest('.expression-entry').remove();
            updateExpressionsData();
            markAsChanged();
        });
        
        // Add event listener to input for updating expressions list
        const valueInput = expressionsContainer.querySelector('.expression-entry:last-child .expression-value');
        valueInput.addEventListener('input', function() {
            updateExpressionsData();
            markAsChanged();
        });
        
        updateExpressionsData();
        markAsChanged();
    }
    
    function updateExpressionsData() {
        expressions = [];
        document.querySelectorAll('.expression-value').forEach(input => {
            if (input.value.trim() !== '') {
                expressions.push(input.value.trim());
            }
        });
        
        console.log("Expressions list updated:", expressions);
        
        // Update all expression selects in the table
        updateTableExpressionSelects();
    }
    
    function updateTableExpressionSelects() {
        document.querySelectorAll('.text-table select.expression-select').forEach(select => {
            const currentValue = select.value;
            
            // Clear select
            select.innerHTML = '';
            
            // Add default "None" option
            const noneOption = document.createElement('option');
            noneOption.value = 'none';
            noneOption.textContent = 'Không có';
            select.appendChild(noneOption);
            
            // Add options for each expression
            expressions.forEach(expression => {
                const option = document.createElement('option');
                option.value = expression;
                option.textContent = expression;
                select.appendChild(option);
            });
            
            // Restore selection if possible
            if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
                select.value = currentValue;
            } else {
                select.selectedIndex = 0;
            }
        });
    }
    
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            textLines = content.split(/\r?\n/);
            
            // Filter out empty lines
            textLines = textLines.filter(line => line.trim() !== '');
            
            // Update hidden text area with the full content
            sourceTextInput.value = content;
            
            // Create table rows for each line
            createTextTable(textLines);
            
            console.log(`Loaded ${textLines.length} lines of text`);
            markAsChanged();
        };
        
        reader.readAsText(file);
    }
    
    // Hàm tạo dòng mới cho bảng văn bản, thêm các nút di chuyển lên/xuống
    function createTextTable(lines) {
        // Clear existing rows
        textTableBody.innerHTML = '';
        
        // Create a row for each line
        lines.forEach((line, index) => {
            const row = document.createElement('tr');
            
            // Line number cell
            const numberCell = document.createElement('td');
            numberCell.textContent = index + 1;
            numberCell.className = 'line-number';
            row.appendChild(numberCell);
            
            // Character select cell
            const characterCell = document.createElement('td');
            const characterSelect = document.createElement('select');
            characterSelect.className = 'character-select';
            
            // Add default "None" option
            const noneOption = document.createElement('option');
            noneOption.value = 'none';
            noneOption.textContent = 'Không có';
            characterSelect.appendChild(noneOption);
            
            // Add option for each character
            characters.forEach(character => {
                const option = document.createElement('option');
                option.value = character;
                option.textContent = character;
                characterSelect.appendChild(option);
            });
            
            characterSelect.addEventListener('change', function() {
                markAsChanged();
            });
            
            // Tạo container cho select và nút copy
            const characterContainer = document.createElement('div');
            characterContainer.className = 'select-with-copy';
            characterContainer.appendChild(characterSelect);
            
            // Thêm nút copy cho character nếu không phải dòng đầu tiên
            if (index > 0) {
                const copyCharacterBtn = document.createElement('button');
                copyCharacterBtn.type = 'button';
                copyCharacterBtn.className = 'mini-copy-btn';
                copyCharacterBtn.innerHTML = '<i class="fas fa-copy"></i>';
                copyCharacterBtn.title = 'Copy nhân vật từ dòng trên';
                copyCharacterBtn.addEventListener('click', function() {
                    copyIndividualField(row, 'character');
                });
                characterContainer.appendChild(copyCharacterBtn);
            }
            
            characterCell.appendChild(characterContainer);
            row.appendChild(characterCell);
            
            // Talking to who select cell
            const talkingToCell = document.createElement('td');
            const talkingToSelect = document.createElement('select');
            talkingToSelect.className = 'talking-to-select';
            
            // Add default "None" option
            const noneTalkingOption = document.createElement('option');
            noneTalkingOption.value = 'none';
            noneTalkingOption.textContent = 'Không có';
            talkingToSelect.appendChild(noneTalkingOption);
            
            // Add option for each character
            characters.forEach(character => {
                const option = document.createElement('option');
                option.value = character;
                option.textContent = character;
                talkingToSelect.appendChild(option);
            });
            
            talkingToSelect.addEventListener('change', function() {
                markAsChanged();
            });
            
            // Add change event to character select to update the talkingTo select
            characterSelect.addEventListener('change', function() {
                // If character is selected, make sure it can't talk to itself
                if (this.value !== 'none') {
                    // Refresh options
                    while (talkingToSelect.options.length > 1) {
                        talkingToSelect.remove(1);
                    }
                    // Add all characters except the selected one
                    characters.forEach(character => {
                        if (character !== this.value) {
                            const option = document.createElement('option');
                            option.value = character;
                            option.textContent = character;
                            talkingToSelect.appendChild(option);
                        }
                    });
                } else {
                    // If no character selected, reset talking-to select
                    talkingToSelect.value = 'none';
                }
            });
            
            // Tạo container cho talking-to select và nút copy
            const talkingToContainer = document.createElement('div');
            talkingToContainer.className = 'select-with-copy';
            talkingToContainer.appendChild(talkingToSelect);
            
            // Thêm nút copy cho talking-to nếu không phải dòng đầu tiên
            if (index > 0) {
                const copyTalkingToBtn = document.createElement('button');
                copyTalkingToBtn.type = 'button';
                copyTalkingToBtn.className = 'mini-copy-btn';
                copyTalkingToBtn.innerHTML = '<i class="fas fa-copy"></i>';
                copyTalkingToBtn.title = 'Copy đang nói với ai từ dòng trên';
                copyTalkingToBtn.addEventListener('click', function() {
                    copyIndividualField(row, 'talkingTo');
                });
                talkingToContainer.appendChild(copyTalkingToBtn);
            }
            
            talkingToCell.appendChild(talkingToContainer);
            row.appendChild(talkingToCell);
            
            // Expression select cell
            const expressionCell = document.createElement('td');
            const expressionSelect = document.createElement('select');
            expressionSelect.className = 'expression-select';
            
            // Add default "None" option
            const noneExpressionOption = document.createElement('option');
            noneExpressionOption.value = 'none';
            noneExpressionOption.textContent = 'Không có';
            expressionSelect.appendChild(noneExpressionOption);
            
            // Add option for each expression
            expressions.forEach(expression => {
                const option = document.createElement('option');
                option.value = expression;
                option.textContent = expression;
                expressionSelect.appendChild(option);
            });
            
            expressionSelect.addEventListener('change', function() {
                markAsChanged();
            });
            
            // Tạo container cho expression select và nút copy
            const expressionContainer = document.createElement('div');
            expressionContainer.className = 'select-with-copy';
            expressionContainer.appendChild(expressionSelect);
            
            // Thêm nút copy cho expression nếu không phải dòng đầu tiên
            if (index > 0) {
                const copyExpressionBtn = document.createElement('button');
                copyExpressionBtn.type = 'button';
                copyExpressionBtn.className = 'mini-copy-btn';
                copyExpressionBtn.innerHTML = '<i class="fas fa-copy"></i>';
                copyExpressionBtn.title = 'Copy biểu hiện từ dòng trên';
                copyExpressionBtn.addEventListener('click', function() {
                    copyIndividualField(row, 'expression');
                });
                expressionContainer.appendChild(copyExpressionBtn);
            }
            
            expressionCell.appendChild(expressionContainer);
            row.appendChild(expressionCell);
            
            // Text cell
            const textCell = document.createElement('td');
            textCell.textContent = line;
            textCell.setAttribute('data-original-text', line);
            textCell.className = 'editable-text';
            textCell.title = 'Nhấp đúp để chỉnh sửa văn bản';
            
            // Thêm sự kiện double-click để chỉnh sửa
            textCell.addEventListener('dblclick', function() {
                makeTextEditable(this);
            });
            row.appendChild(textCell);
            
            // Translation cell - Cột bản dịch mới
            const translationCell = document.createElement('td');
            translationCell.className = 'translation-cell editable-text';
            translationCell.textContent = '';
            translationCell.setAttribute('data-translation', '');
            translationCell.title = 'Nhấp đúp để chỉnh sửa bản dịch';
            translationCell.style.minWidth = '200px';
            translationCell.style.maxWidth = '300px';
            translationCell.style.wordWrap = 'break-word';
            
            // Thêm sự kiện double-click để chỉnh sửa bản dịch
            translationCell.addEventListener('dblclick', function() {
                makeTranslationEditable(this);
            });
            
            // Thêm sự kiện để tự động update kết quả dịch khi có thay đổi
            translationCell.addEventListener('input', function() {
                updateFinalTranslationResult();
                markAsChanged();
            });
            
            // Tạo container cho nút dịch lại
            const translateButtonContainer = document.createElement('div');
            translateButtonContainer.className = 'translate-row-container';
            translateButtonContainer.style.marginTop = '5px';
            
            // Thêm nút dịch lại cho từng hàng
            const retranslateBtn = document.createElement('button');
            retranslateBtn.type = 'button';
            retranslateBtn.className = 'btn btn-small retranslate-row-btn';
            retranslateBtn.innerHTML = '<i class="fas fa-language"></i> Dịch lại';
            retranslateBtn.title = 'Dịch lại hàng này';
            retranslateBtn.style.fontSize = '12px';
            retranslateBtn.style.padding = '3px 8px';
            retranslateBtn.addEventListener('click', function() {
                retranslateRow(row, index);
            });
            translateButtonContainer.appendChild(retranslateBtn);
            
            translationCell.appendChild(translateButtonContainer);
            row.appendChild(translationCell);
            
            // Thêm nút hành động di chuyển và xóa
            const actionSpan = document.createElement('span');
            actionSpan.className = 'table-row-actions';
            
            // Nút copy từ dòng trên
            if (index > 0) {
                const copyFromAboveBtn = document.createElement('button');
                copyFromAboveBtn.type = 'button';
                copyFromAboveBtn.className = 'action-btn copy-from-above-btn';
                copyFromAboveBtn.innerHTML = '<i class="fas fa-copy"></i>';
                copyFromAboveBtn.title = 'Copy thông tin nhân vật từ dòng trên';
                copyFromAboveBtn.addEventListener('click', function() {
                    copyCharacterInfoFromAbove(row);
                });
                actionSpan.appendChild(copyFromAboveBtn);
            }

            // Nút copy và đảo vị trí đối thoại
            if (index > 0) {
                const swapDialogueBtn = document.createElement('button');
                swapDialogueBtn.type = 'button';
                swapDialogueBtn.className = 'action-btn swap-dialogue-btn';
                swapDialogueBtn.innerHTML = '<i class="fas fa-exchange-alt"></i>';
                swapDialogueBtn.title = 'Copy và đảo vị trí đối thoại (A nói với B → B nói với A)';
                swapDialogueBtn.addEventListener('click', function() {
                    copyAndSwapDialogue(row);
                });
                actionSpan.appendChild(swapDialogueBtn);
            }

            // Nút di chuyển lên
            if (index > 0) {
                const moveUpBtn = document.createElement('button');
                moveUpBtn.type = 'button';
                moveUpBtn.className = 'action-btn move-up-btn';
                moveUpBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
                moveUpBtn.title = 'Di chuyển lên';
                moveUpBtn.addEventListener('click', function() {
                    moveRow(row, 'up');
                });
                actionSpan.appendChild(moveUpBtn);
            }
            
            // Nút di chuyển xuống
            if (index < lines.length - 1) {
                const moveDownBtn = document.createElement('button');
                moveDownBtn.type = 'button';
                moveDownBtn.className = 'action-btn move-down-btn';
                moveDownBtn.innerHTML = '<i class="fas fa-arrow-down"></i>';
                moveDownBtn.title = 'Di chuyển xuống';
                moveDownBtn.addEventListener('click', function() {
                    moveRow(row, 'down');
                });
                actionSpan.appendChild(moveDownBtn);
            }
            
            // Nút sửa dòng
            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'action-btn edit-row-btn';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = 'Chỉnh sửa dòng này';
            editBtn.addEventListener('click', function() {
                makeTextEditable(textCell);
            });
            actionSpan.appendChild(editBtn);
            
            // Nút xóa dòng
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'action-btn delete-row-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.title = 'Xóa dòng này';
            deleteBtn.addEventListener('click', function() {
                deleteTextRow(row, index);
            });
            actionSpan.appendChild(deleteBtn);
            
            textCell.appendChild(actionSpan);
            
            // Add row to table body
            textTableBody.appendChild(row);
        });
    }
    
    // Hàm di chuyển dòng lên/xuống
    function moveRow(row, direction) {
        const rows = Array.from(textTableBody.querySelectorAll('tr'));
        const currentIndex = rows.indexOf(row);
        
        if (direction === 'up' && currentIndex > 0) {
            // Di chuyển lên
            const targetIndex = currentIndex - 1;
            
            // Hoán đổi vị trí trong DOM
            textTableBody.insertBefore(row, rows[targetIndex]);
            
            // Hoán đổi dữ liệu trong mảng textLines
            [textLines[targetIndex], textLines[currentIndex]] = [textLines[currentIndex], textLines[targetIndex]];
            
            // Cập nhật lại số thứ tự
            updateRowNumbers();
            
            // Đánh dấu đã thay đổi
            markAsChanged();
        } else if (direction === 'down' && currentIndex < rows.length - 1) {
            // Di chuyển xuống
            const targetIndex = currentIndex + 1;
            
            // Hoán đổi vị trí trong DOM
            if (rows[targetIndex].nextElementSibling) {
                textTableBody.insertBefore(row, rows[targetIndex].nextElementSibling);
            } else {
                textTableBody.appendChild(row);
            }
            
            // Hoán đổi dữ liệu trong mảng textLines
            [textLines[currentIndex], textLines[targetIndex]] = [textLines[targetIndex], textLines[currentIndex]];
            
            // Cập nhật lại số thứ tự
            updateRowNumbers();
            
            // Đánh dấu đã thay đổi
            markAsChanged();
        }
        
        // Cập nhật nút di chuyển (lên/xuống) cho tất cả các dòng
        updateMoveButtons();
    }
    
    // Cập nhật số thứ tự cho tất cả các dòng
    function updateRowNumbers() {
        const rows = textTableBody.querySelectorAll('tr');
        rows.forEach((row, idx) => {
            row.querySelector('.line-number').textContent = idx + 1;
            
            // Cập nhật lại sự kiện xóa với index mới
            const deleteBtn = row.querySelector('.delete-row-btn');
            if (deleteBtn) {
                deleteBtn.onclick = null;
                deleteBtn.addEventListener('click', function() {
                    deleteTextRow(row, idx);
                });
            }
        });
        
        // Cập nhật textarea chứa toàn bộ nội dung
        sourceTextInput.value = textLines.join('\n');
    }
    
    // Cập nhật nút di chuyển cho tất cả các dòng
    function updateMoveButtons() {
        const rows = Array.from(textTableBody.querySelectorAll('tr'));
        
        rows.forEach((row, idx) => {
            const actionsContainer = row.querySelector('.table-row-actions');
            if (!actionsContainer) return;
            
            // Xóa nút di chuyển, copy và swap cũ
            const oldCopyBtn = actionsContainer.querySelector('.copy-from-above-btn');
            const oldSwapBtn = actionsContainer.querySelector('.swap-dialogue-btn');
            const oldMoveUpBtn = actionsContainer.querySelector('.move-up-btn');
            const oldMoveDownBtn = actionsContainer.querySelector('.move-down-btn');
            if (oldCopyBtn) actionsContainer.removeChild(oldCopyBtn);
            if (oldSwapBtn) actionsContainer.removeChild(oldSwapBtn);
            if (oldMoveUpBtn) actionsContainer.removeChild(oldMoveUpBtn);
            if (oldMoveDownBtn) actionsContainer.removeChild(oldMoveDownBtn);
            
            // Thêm nút copy từ dòng trên nếu không phải dòng đầu tiên
            if (idx > 0) {
                const copyFromAboveBtn = document.createElement('button');
                copyFromAboveBtn.type = 'button';
                copyFromAboveBtn.className = 'action-btn copy-from-above-btn';
                copyFromAboveBtn.innerHTML = '<i class="fas fa-copy"></i>';
                copyFromAboveBtn.title = 'Copy thông tin nhân vật từ dòng trên';
                copyFromAboveBtn.addEventListener('click', function() {
                    copyCharacterInfoFromAbove(row);
                });
                actionsContainer.insertBefore(copyFromAboveBtn, actionsContainer.firstChild);
            }

            // Thêm nút copy và đảo vị trí đối thoại nếu không phải dòng đầu tiên
            if (idx > 0) {
                const swapDialogueBtn = document.createElement('button');
                swapDialogueBtn.type = 'button';
                swapDialogueBtn.className = 'action-btn swap-dialogue-btn';
                swapDialogueBtn.innerHTML = '<i class="fas fa-exchange-alt"></i>';
                swapDialogueBtn.title = 'Copy và đảo vị trí đối thoại (A nói với B → B nói với A)';
                swapDialogueBtn.addEventListener('click', function() {
                    copyAndSwapDialogue(row);
                });
                
                // Thêm sau nút copy
                const copyBtn = actionsContainer.querySelector('.copy-from-above-btn');
                if (copyBtn && copyBtn.nextElementSibling) {
                    actionsContainer.insertBefore(swapDialogueBtn, copyBtn.nextElementSibling);
                } else {
                    actionsContainer.appendChild(swapDialogueBtn);
                }
            }

            // Thêm nút di chuyển lên nếu không phải dòng đầu tiên
            if (idx > 0) {
                const moveUpBtn = document.createElement('button');
                moveUpBtn.type = 'button';
                moveUpBtn.className = 'action-btn move-up-btn';
                moveUpBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
                moveUpBtn.title = 'Di chuyển lên';
                moveUpBtn.addEventListener('click', function() {
                    moveRow(row, 'up');
                });
                
                // Thêm sau nút copy nhưng trước nút xóa
                const copyBtn = actionsContainer.querySelector('.copy-from-above-btn');
                if (copyBtn && copyBtn.nextElementSibling) {
                    actionsContainer.insertBefore(moveUpBtn, copyBtn.nextElementSibling);
                } else {
                    actionsContainer.insertBefore(moveUpBtn, actionsContainer.firstChild);
                }
            }
            
            // Thêm nút di chuyển xuống nếu không phải dòng cuối cùng
            if (idx < rows.length - 1) {
                const moveDownBtn = document.createElement('button');
                moveDownBtn.type = 'button';
                moveDownBtn.className = 'action-btn move-down-btn';
                moveDownBtn.innerHTML = '<i class="fas fa-arrow-down"></i>';
                moveDownBtn.title = 'Di chuyển xuống';
                moveDownBtn.addEventListener('click', function() {
                    moveRow(row, 'down');
                });
                
                // Thêm trước nút xóa
                const deleteBtn = actionsContainer.querySelector('.delete-row-btn');
                if (deleteBtn) {
                    actionsContainer.insertBefore(moveDownBtn, deleteBtn);
                } else {
                    actionsContainer.appendChild(moveDownBtn);
                }
            }
        });
    }

    // Hàm copy thông tin nhân vật từ dòng trên xuống dòng hiện tại
    function copyCharacterInfoFromAbove(currentRow) {
        const rows = Array.from(textTableBody.querySelectorAll('tr'));
        const currentIndex = rows.indexOf(currentRow);
        
        if (currentIndex <= 0) {
            alert('Không thể copy từ dòng trên vì đây là dòng đầu tiên!');
            return;
        }
        
        const aboveRow = rows[currentIndex - 1];
        
        // Lấy thông tin từ dòng trên
        const aboveCharacterSelect = aboveRow.querySelector('.character-select');
        const aboveTalkingToSelect = aboveRow.querySelector('.talking-to-select');
        const aboveExpressionSelect = aboveRow.querySelector('.expression-select');
        
        // Áp dụng cho dòng hiện tại
        const currentCharacterSelect = currentRow.querySelector('.character-select');
        const currentTalkingToSelect = currentRow.querySelector('.talking-to-select');
        const currentExpressionSelect = currentRow.querySelector('.expression-select');
        
        if (aboveCharacterSelect && currentCharacterSelect) {
            currentCharacterSelect.value = aboveCharacterSelect.value;
            
            // Trigger change event để cập nhật talking-to options
            const changeEvent = new Event('change', { bubbles: true });
            currentCharacterSelect.dispatchEvent(changeEvent);
        }
        
        if (aboveTalkingToSelect && currentTalkingToSelect) {
            // Chờ một chút để talking-to select được cập nhật từ character change event
            setTimeout(() => {
                currentTalkingToSelect.value = aboveTalkingToSelect.value;
            }, 50);
        }
        
        if (aboveExpressionSelect && currentExpressionSelect) {
            currentExpressionSelect.value = aboveExpressionSelect.value;
        }
        
        // Đánh dấu đã thay đổi
        markAsChanged();
    }

    // Hàm copy từng trường riêng lẻ từ dòng trên
    function copyIndividualField(currentRow, fieldType) {
        const rows = Array.from(textTableBody.querySelectorAll('tr'));
        const currentIndex = rows.indexOf(currentRow);
        
        if (currentIndex <= 0) {
            alert('Không thể copy từ dòng trên vì đây là dòng đầu tiên!');
            return;
        }
        
        const aboveRow = rows[currentIndex - 1];
        
        switch (fieldType) {
            case 'character':
                const aboveCharacterSelect = aboveRow.querySelector('.character-select');
                const currentCharacterSelect = currentRow.querySelector('.character-select');
                
                if (aboveCharacterSelect && currentCharacterSelect) {
                    currentCharacterSelect.value = aboveCharacterSelect.value;
                    // Trigger change event để cập nhật talking-to options
                    const changeEvent = new Event('change', { bubbles: true });
                    currentCharacterSelect.dispatchEvent(changeEvent);
                }
                break;
                
            case 'talkingTo':
                const aboveTalkingToSelect = aboveRow.querySelector('.talking-to-select');
                const currentTalkingToSelect = currentRow.querySelector('.talking-to-select');
                
                if (aboveTalkingToSelect && currentTalkingToSelect) {
                    currentTalkingToSelect.value = aboveTalkingToSelect.value;
                }
                break;
                
            case 'expression':
                const aboveExpressionSelect = aboveRow.querySelector('.expression-select');
                const currentExpressionSelect = currentRow.querySelector('.expression-select');
                
                if (aboveExpressionSelect && currentExpressionSelect) {
                    currentExpressionSelect.value = aboveExpressionSelect.value;
                }
                break;
        }
        
        // Đánh dấu đã thay đổi
        markAsChanged();
    }

    // Hàm copy và đảo vị trí đối thoại từ dòng trên
    function copyAndSwapDialogue(currentRow) {
        const rows = Array.from(textTableBody.querySelectorAll('tr'));
        const currentIndex = rows.indexOf(currentRow);
        
        if (currentIndex <= 0) {
            alert('Không thể copy từ dòng trên vì đây là dòng đầu tiên!');
            return;
        }
        
        const aboveRow = rows[currentIndex - 1];
        
        // Lấy thông tin từ dòng trên
        const aboveCharacterSelect = aboveRow.querySelector('.character-select');
        const aboveTalkingToSelect = aboveRow.querySelector('.talking-to-select');
        const aboveExpressionSelect = aboveRow.querySelector('.expression-select');
        
        // Lấy element của dòng hiện tại
        const currentCharacterSelect = currentRow.querySelector('.character-select');
        const currentTalkingToSelect = currentRow.querySelector('.talking-to-select');
        const currentExpressionSelect = currentRow.querySelector('.expression-select');
        
        if (aboveCharacterSelect && aboveTalkingToSelect && currentCharacterSelect && currentTalkingToSelect) {
            const aboveCharacter = aboveCharacterSelect.value;
            const aboveTalkingTo = aboveTalkingToSelect.value;
            
            // Đảo vị trí: nhân vật dòng trên thành "đang nói với ai" dòng hiện tại
            // và "đang nói với ai" dòng trên thành nhân vật dòng hiện tại
            if (aboveCharacter !== 'none' && aboveTalkingTo !== 'none') {
                // Set nhân vật hiện tại = đang nói với ai dòng trên
                currentCharacterSelect.value = aboveTalkingTo;
                
                // Trigger change event để cập nhật talking-to options
                const changeEvent = new Event('change', { bubbles: true });
                currentCharacterSelect.dispatchEvent(changeEvent);
                
                // Chờ một chút để talking-to select được cập nhật
                setTimeout(() => {
                    // Set đang nói với ai hiện tại = nhân vật dòng trên
                    currentTalkingToSelect.value = aboveCharacter;
                }, 50);
            } else if (aboveCharacter !== 'none' && aboveTalkingTo === 'none') {
                // Nếu dòng trên chỉ có nhân vật, không có đối tượng nói chuyện
                // Thì dòng hiện tại sẽ nói với nhân vật đó
                currentCharacterSelect.value = 'none';
                
                const changeEvent = new Event('change', { bubbles: true });
                currentCharacterSelect.dispatchEvent(changeEvent);
                
                setTimeout(() => {
                    currentTalkingToSelect.value = aboveCharacter;
                }, 50);
            } else {
                // Nếu không đủ thông tin để đảo, chỉ copy bình thường
                currentCharacterSelect.value = aboveCharacterSelect.value;
                
                const changeEvent = new Event('change', { bubbles: true });
                currentCharacterSelect.dispatchEvent(changeEvent);
                
                setTimeout(() => {
                    currentTalkingToSelect.value = aboveTalkingToSelect.value;
                }, 50);
            }
        }
        
        // Copy biểu hiện nếu có
        if (aboveExpressionSelect && currentExpressionSelect) {
            currentExpressionSelect.value = aboveExpressionSelect.value;
        }
        
        // Đánh dấu đã thay đổi
        markAsChanged();
    }

    // Hàm xóa một dòng văn bản
    function deleteTextRow(row, index) {
        // Kiểm tra xem nút xóa có đang được xử lý không
        if (row.getAttribute('data-deleting') === 'true') {
            return;
        }
        
        // Đánh dấu đang trong quá trình xóa
        row.setAttribute('data-deleting', 'true');
        
        if (confirm('Bạn có chắc chắn muốn xóa dòng này không?')) {
            // Xác định index thực của dòng (vì phần tử row có thể đã thay đổi vị trí)
            const currentIndex = Array.from(textTableBody.querySelectorAll('tr')).indexOf(row);
            
            // Xóa dòng khỏi mảng textLines với index đã xác định lại
            textLines.splice(currentIndex, 1);
            
            // Xóa dòng khỏi bảng
            row.parentNode.removeChild(row);
            
            // Cập nhật lại số thứ tự các dòng
            const rows = textTableBody.querySelectorAll('tr');
            rows.forEach((row, idx) => {
                row.cells[0].textContent = idx + 1;
                
                // Cập nhật lại sự kiện xóa với index mới
                const deleteBtn = row.querySelector('.delete-row-btn');
                if (deleteBtn) {
                    deleteBtn.onclick = null;
                    deleteBtn.addEventListener('click', function() {
                        deleteTextRow(row, idx);
                    });
                }
            });
            
            // Cập nhật textarea chứa toàn bộ nội dung
            sourceTextInput.value = textLines.join('\n');
            
            // Đánh dấu đã thay đổi
            markAsChanged();
            
            // Thông báo đã xóa
            showToast('Đã xóa dòng thành công', 'info');
        } else {
            // Hủy đánh dấu xóa nếu người dùng chọn Cancel
            row.removeAttribute('data-deleting');
        }
    }
    
    // Thêm nút xóa dòng trong hàm addNewTextRow
    function addNewTextRow() {
        // Thêm dòng trống vào mảng textLines
        textLines.push('');
        
        // Tạo dòng mới
        const row = document.createElement('tr');
        
        // Line number cell
        const numberCell = document.createElement('td');
        numberCell.textContent = textLines.length;
        numberCell.className = 'line-number';
        row.appendChild(numberCell);
        
        // Character select cell
        const characterCell = document.createElement('td');
        const characterSelect = document.createElement('select');
        characterSelect.className = 'character-select';
        
        // Add default "None" option
        const noneOption = document.createElement('option');
        noneOption.value = 'none';
        noneOption.textContent = 'Không có';
        characterSelect.appendChild(noneOption);
        
        // Add option for each character
        characters.forEach(character => {
            const option = document.createElement('option');
            option.value = character;
            option.textContent = character;
            characterSelect.appendChild(option);
        });
        
        characterSelect.addEventListener('change', function() {
            markAsChanged();
        });
        
        // Tạo container cho character select và nút copy
        const characterContainer = document.createElement('div');
        characterContainer.className = 'select-with-copy';
        characterContainer.appendChild(characterSelect);
        
        // Thêm nút copy cho character (luôn thêm vì đây sẽ không phải dòng đầu tiên)
        const copyCharacterBtn = document.createElement('button');
        copyCharacterBtn.type = 'button';
        copyCharacterBtn.className = 'mini-copy-btn';
        copyCharacterBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyCharacterBtn.title = 'Copy nhân vật từ dòng trên';
        copyCharacterBtn.addEventListener('click', function() {
            copyIndividualField(row, 'character');
        });
        characterContainer.appendChild(copyCharacterBtn);
        
        characterCell.appendChild(characterContainer);
        row.appendChild(characterCell);
        
        // Talking to who select cell
        const talkingToCell = document.createElement('td');
        const talkingToSelect = document.createElement('select');
        talkingToSelect.className = 'talking-to-select';
        
        // Add default "None" option
        const noneTalkingOption = document.createElement('option');
        noneTalkingOption.value = 'none';
        noneTalkingOption.textContent = 'Không có';
        talkingToSelect.appendChild(noneTalkingOption);
        
        // Add option for each character
        characters.forEach(character => {
            const option = document.createElement('option');
            option.value = character;
            option.textContent = character;
            talkingToSelect.appendChild(option);
        });
        
        talkingToSelect.addEventListener('change', function() {
            markAsChanged();
        });
        
        // Add change event to character select to update the talkingTo select
        characterSelect.addEventListener('change', function() {
            // If character is selected, make sure it can't talk to itself
            if (this.value !== 'none') {
                // Refresh options
                while (talkingToSelect.options.length > 1) {
                    talkingToSelect.remove(1);
                }
                // Add all characters except the selected one
                characters.forEach(character => {
                    if (character !== this.value) {
                        const option = document.createElement('option');
                        option.value = character;
                        option.textContent = character;
                        talkingToSelect.appendChild(option);
                    }
                });
            } else {
                // If no character selected, reset talking-to select
                talkingToSelect.value = 'none';
            }
        });
        
        // Tạo container cho talking-to select và nút copy
        const talkingToContainer = document.createElement('div');
        talkingToContainer.className = 'select-with-copy';
        talkingToContainer.appendChild(talkingToSelect);
        
        // Thêm nút copy cho talking-to
        const copyTalkingToBtn = document.createElement('button');
        copyTalkingToBtn.type = 'button';
        copyTalkingToBtn.className = 'mini-copy-btn';
        copyTalkingToBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyTalkingToBtn.title = 'Copy đang nói với ai từ dòng trên';
        copyTalkingToBtn.addEventListener('click', function() {
            copyIndividualField(row, 'talkingTo');
        });
        talkingToContainer.appendChild(copyTalkingToBtn);
        
        talkingToCell.appendChild(talkingToContainer);
        row.appendChild(talkingToCell);
        
        // Expression select cell
        const expressionCell = document.createElement('td');
        const expressionSelect = document.createElement('select');
        expressionSelect.className = 'expression-select';
        
        // Add default "None" option
        const noneExpressionOption = document.createElement('option');
        noneExpressionOption.value = 'none';
        noneExpressionOption.textContent = 'Không có';
        expressionSelect.appendChild(noneExpressionOption);
        
        // Add option for each expression
        expressions.forEach(expression => {
            const option = document.createElement('option');
            option.value = expression;
            option.textContent = expression;
            expressionSelect.appendChild(option);
        });
        
        expressionSelect.addEventListener('change', function() {
            markAsChanged();
        });
        
        // Tạo container cho expression select và nút copy
        const expressionContainer = document.createElement('div');
        expressionContainer.className = 'select-with-copy';
        expressionContainer.appendChild(expressionSelect);
        
        // Thêm nút copy cho expression
        const copyExpressionBtn = document.createElement('button');
        copyExpressionBtn.type = 'button';
        copyExpressionBtn.className = 'mini-copy-btn';
        copyExpressionBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyExpressionBtn.title = 'Copy biểu hiện từ dòng trên';
        copyExpressionBtn.addEventListener('click', function() {
            copyIndividualField(row, 'expression');
        });
        expressionContainer.appendChild(copyExpressionBtn);
        
        expressionCell.appendChild(expressionContainer);
        row.appendChild(expressionCell);
        
        // Text cell (empty)
        const textCell = document.createElement('td');
        textCell.textContent = '';
        textCell.setAttribute('data-original-text', '');
        textCell.className = 'editable-text';
        textCell.title = 'Nhấp đúp để chỉnh sửa văn bản';
        
        // Thêm sự kiện double-click để chỉnh sửa
        textCell.addEventListener('dblclick', function() {
            makeTextEditable(this);
        });
        row.appendChild(textCell);
        
        // Translation cell - Cột bản dịch mới (empty)
        const translationCell = document.createElement('td');
        translationCell.className = 'translation-cell editable-text';
        translationCell.textContent = '';
        translationCell.setAttribute('data-translation', '');
        translationCell.title = 'Nhấp đúp để chỉnh sửa bản dịch';
        translationCell.style.minWidth = '200px';
        translationCell.style.maxWidth = '300px';
        translationCell.style.wordWrap = 'break-word';
        
        // Thêm sự kiện double-click để chỉnh sửa bản dịch
        translationCell.addEventListener('dblclick', function() {
            makeTranslationEditable(this);
        });
        
        // Thêm sự kiện để tự động update kết quả dịch khi có thay đổi
        translationCell.addEventListener('input', function() {
            updateFinalTranslationResult();
            markAsChanged();
        });
        
        // Tạo container cho nút dịch lại
        const translateButtonContainer = document.createElement('div');
        translateButtonContainer.className = 'translate-row-container';
        translateButtonContainer.style.marginTop = '5px';
        
        // Thêm nút dịch lại cho từng hàng
        const retranslateBtn = document.createElement('button');
        retranslateBtn.type = 'button';
        retranslateBtn.className = 'btn btn-small retranslate-row-btn';
        retranslateBtn.innerHTML = '<i class="fas fa-language"></i> Dịch lại';
        retranslateBtn.title = 'Dịch lại hàng này';
        retranslateBtn.style.fontSize = '12px';
        retranslateBtn.style.padding = '3px 8px';
        retranslateBtn.addEventListener('click', function() {
            const currentRowIndex = Array.from(textTableBody.querySelectorAll('tr')).indexOf(row);
            retranslateRow(row, currentRowIndex);
        });
        translateButtonContainer.appendChild(retranslateBtn);
        
        translationCell.appendChild(translateButtonContainer);
        row.appendChild(translationCell);
        
        // Thêm các nút hành động
        const actionSpan = document.createElement('span');
        actionSpan.className = 'table-row-actions';
        
        // Nút di chuyển lên (luôn có vì dòng mới là dòng cuối)
        const moveUpBtn = document.createElement('button');
        moveUpBtn.type = 'button';
        moveUpBtn.className = 'action-btn move-up-btn';
        moveUpBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        moveUpBtn.title = 'Di chuyển lên';
        moveUpBtn.addEventListener('click', function() {
            moveRow(row, 'up');
        });
        actionSpan.appendChild(moveUpBtn);
        
        // Nút xóa dòng
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'action-btn delete-row-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.title = 'Xóa dòng này';
        deleteBtn.addEventListener('click', function() {
            // Sử dụng vị trí thực tế của dòng trong bảng
            const currentRowIndex = Array.from(textTableBody.querySelectorAll('tr')).indexOf(row);
            deleteTextRow(row, currentRowIndex);
        });
        actionSpan.appendChild(deleteBtn);
        
        textCell.appendChild(actionSpan);
        
        // Add row to table body
        textTableBody.appendChild(row);
        
        // Cập nhật nút di chuyển cho tất cả các dòng
        updateMoveButtons();
        
        // Cập nhật textarea chứa toàn bộ nội dung
        sourceTextInput.value = textLines.join('\n');
        
        // Bắt đầu chỉnh sửa ngay lập tức
        setTimeout(() => makeTextEditable(textCell), 0);
        
        // Đánh dấu đã thay đổi
        markAsChanged();
    }
    
    // Update character selects in the table when character list changes
    function updateTableCharacterSelects() {
        // Lấy tất cả các select box nhân vật trong bảng
        const characterSelects = document.querySelectorAll('#text-table-body .character-select');
        const talkingToSelects = document.querySelectorAll('#text-table-body .talking-to-select');
        
        // Cập nhật cho từng select box
        characterSelects.forEach((select, index) => {
            // Lưu lại giá trị đã chọn
            const selectedValue = select.value;
            
            // Xóa tất cả các option hiện tại (trừ option "Không có")
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // Thêm lại các option mới từ danh sách nhân vật
            characters.forEach(character => {
                const option = document.createElement('option');
                option.value = character;
                option.textContent = character;
                select.appendChild(option);
            });
            
            // Khôi phục giá trị đã chọn nếu vẫn còn tồn tại trong danh sách
            if (selectedValue && (selectedValue === 'none' || characters.includes(selectedValue))) {
                select.value = selectedValue;
            } else {
                select.value = 'none';
            }
            
            // Cập nhật cả select talking-to tương ứng
            if (talkingToSelects[index]) {
                const talkingToSelect = talkingToSelects[index];
                const talkingToSelectedValue = talkingToSelect.value;
                
                // Xóa tất cả các option hiện tại (trừ option "Không có")
                while (talkingToSelect.options.length > 1) {
                    talkingToSelect.remove(1);
                }
                
                // Nếu có nhân vật được chọn, thêm các nhân vật khác vào select talking-to
                if (selectedValue && selectedValue !== 'none') {
                    characters.forEach(character => {
                        if (character !== selectedValue) {
                            const option = document.createElement('option');
                            option.value = character;
                            option.textContent = character;
                            talkingToSelect.appendChild(option);
                        }
                    });
                    
                    // Khôi phục giá trị đã chọn nếu vẫn còn tồn tại và không phải là nhân vật được chọn
                    if (talkingToSelectedValue && 
                        talkingToSelectedValue !== 'none' && 
                        characters.includes(talkingToSelectedValue) && 
                        talkingToSelectedValue !== selectedValue) {
                        talkingToSelect.value = talkingToSelectedValue;
                    } else {
                        talkingToSelect.value = 'none';
                    }
                } else {
                    // Nếu không có nhân vật nào được chọn, đặt về "Không có"
                    talkingToSelect.value = 'none';
                }
            }
        });
    }
    
    // Add a few expressions by default if none exist
    if (expressionsContainer.children.length === 0) {
        // Define some default expressions
        const defaultExpressions = [
            'Giữ nguyên', 'Vui vẻ', 'Buồn bã', 'Tức giận', 'Suy nghĩ', 
            'Hét lớn', 'Khóc lóc', 'Cười nhẹ', 'Nghiêm túc', 
        ];
        
        // Add them to the UI
        defaultExpressions.forEach(expr => {
            const newExpression = expressionTemplate.content.cloneNode(true);
            expressionsContainer.appendChild(newExpression);
            
            const valueInput = expressionsContainer.querySelector('.expression-entry:last-child .expression-value');
            valueInput.value = expr;
            
            const removeBtn = expressionsContainer.querySelector('.expression-entry:last-child .remove-btn');
            removeBtn.addEventListener('click', function() {
                this.closest('.expression-entry').remove();
                updateExpressionsData();
                markAsChanged();
            });
            
            valueInput.addEventListener('input', function() {
                updateExpressionsData();
                markAsChanged();
            });
        });
        
        updateExpressionsData();
    }
    
    // Hàm lấy văn bản gốc cần dịch
    function getOriginalText() {
        // Nếu có dữ liệu trong bảng văn bản, sử dụng nó
        if (textTableBody.children.length > 0) {
            return Array.from(textTableBody.querySelectorAll('tr')).map(row => {
                const textCell = row.querySelector('td:nth-child(5)'); // Cột văn bản vẫn là cột thứ 5
                return textCell.getAttribute('data-original-text') || textCell.textContent;
            }).join('\n');
        }
        
        // Ngược lại, sử dụng văn bản từ ô nhập liệu
        return sourceTextInput.value.trim();
    }
    
    // Hàm hiển thị thông báo lỗi
    function displayErrorMessage(message) {
        showToast(message, 'error');
        
        // Hiển thị thông báo lỗi trong kết quả dịch
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        translationResult.innerHTML = '';
        translationResult.appendChild(errorElement);
        

        
        console.error(message);
    }
    
    // Hàm tạo system prompt cho dịch thuật
    function createTranslationSystemPrompt() {
        return `Bạn là một chuyên gia dịch thuật chuyên nghiệp với khả năng đặc biệt trong việc dịch truyện đa ngôn ngữ (tiếng Anh, tiếng Nhật, tiếng Trung, tiếng Hàn, v.v...) sang tiếng Việt.

CÁC NGUYÊN TẮC DỊCH THUẬT CỐT LÕI:

1. **Độ chính xác ngữ nghĩa**: Luôn ưu tiên truyền tải đúng và đầy đủ ý nghĩa gốc. Không được bỏ sót hoặc thêm thông tin không có trong bản gốc.

2. **Tự nhiên trong tiếng Việt**: Đảm bảo bản dịch nghe tự nhiên, không bị máy móc hay khó hiểu. Sử dụng cấu trúc câu và từ vựng phù hợp với người Việt.

3. **Giữ phong cách và tone**: Duy trì phong cách, cảm xúc và tone của nhân vật. Ví dụ: nhân vật ngoan hiền thì dịch nhẹ nhàng, nhân vật hung hăng thì dịch mạnh mẽ.

CÁC QUY TẮC ĐỊNH DẠNG:
- Luôn trả về kết quả theo đúng định dạng được yêu cầu
- Không thêm giải thích, mô tả hay bình luận
- Giữ nguyên cấu trúc và phân đoạn của văn bản gốc
- Tuân thủ nghiêm ngặt các hướng dẫn cụ thể được đưa ra

Hãy dịch với tâm thế của một dịch giả chuyên nghiệp đa ngôn ngữ, tập trung vào chất lượng và trải nghiệm đọc tốt nhất cho người Việt.`;
    }

    // Hàm gọi API Google AI Studio với systemInstruction
    async function callGoogleAPI(apiKey, prompt, systemPrompt = null) {
        try {
            const url = `${GOOGLE_API_URL}?key=${apiKey}`;
            
            // Tạo request body
            const requestBody = {
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    topK: 64,
                    topP: 0.95,
                    maxOutputTokens: 65536,
                    thinkingConfig: {
                        includeThoughts: true,
                        thinkingBudget: 15000
                    },
                    responseMimeType: "text/plain"
                }
            };
            
            // Thêm systemInstruction nếu có system prompt
            if (systemPrompt) {
                requestBody.systemInstruction = {
                    parts: [
                        {
                            text: systemPrompt
                        }
                    ]
                };
            }
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                referrerPolicy: 'no-referrer'
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'API đang lỗi hoặc quá tải hoặc hết hạn mức.'}`);
            }
            const data = await response.json();
            return data.candidates[0].content.parts[1].text;
        } catch (error) {
            throw error;
        }
    }
    
    // Cập nhật trạng thái nút dịch
    function updateButtonState() {
        translateBtn.disabled = isLoading;
        
        // Kiểm tra sự tồn tại của các nút trước khi cập nhật
        if (refineAgainBtn) {
            refineAgainBtn.disabled = isLoading || !translationResult.textContent.trim();
            
            if (isLoading) {
                refineAgainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang trau chuốt...';
            } else {
                refineAgainBtn.innerHTML = '<i class="fas fa-magic"></i> Trau chuốt lần nữa';
            }
        }
        
        if (copyTextBtn) {
            copyTextBtn.disabled = isLoading || !translationResult.textContent.trim();
            
            if (isLoading) {
                copyTextBtn.style.opacity = '0.5';
                copyTextBtn.style.cursor = 'not-allowed';
            } else {
                copyTextBtn.style.opacity = translationResult.textContent.trim() ? '1' : '0.5';
                copyTextBtn.style.cursor = translationResult.textContent.trim() ? 'pointer' : 'not-allowed';
            }
        }
        
        if (isLoading) {
            translateBtn.textContent = 'Đang dịch...';
            loadingIndicator.style.display = 'block';
        } else {
            translateBtn.textContent = 'Dịch văn bản';
            loadingIndicator.style.display = 'none';
        }
    }

    async function refineAgain() {
        // Kiểm tra nếu không có kết quả dịch hoặc đang trong quá trình xử lý
        if (isLoading || !translationResult.textContent.trim()) {
            displayErrorMessage('Không có kết quả dịch để trau chuốt thêm.');
            return;
        }

        // Sử dụng model cố định Google Gemini 2.5 Pro
        const model = "google/gemini-2.5-pro";

        // Kiểm tra xem có analytics và webhook không
        if (window.analytics) {
            const textContent = translationResult.textContent;
            const charCount = textContent.length;
            const previewText = textContent.substring(0, 100) + (textContent.length > 100 ? '...' : '');
            
            // Gửi thông báo bắt đầu trau chuốt
            window.analytics.ensureIpThenSend({
                embeds: [{
                    title: '🔄 Bắt đầu trau chuốt thêm lần nữa',
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
                            name: 'Trạng thái',
                            value: 'Bắt đầu xử lý'
                        },
                        {
                            name: 'Model AI',
                            value: model
                        },
                        {
                            name: 'Độ dài văn bản',
                            value: `${charCount} ký tự`
                        },
                        {
                            name: 'Thời gian bắt đầu',
                            value: new Date().toLocaleString('vi-VN')
                        }
                    ],
                    color: 0xF1C40F
                }]
            });
        }

        // Hiển thị tiến trình
        const progressElement = document.createElement('div');
        progressElement.className = 'translation-progress';
        progressElement.innerHTML = `
            <div class="progress-step step-active">Trau chuốt bản dịch thêm một lần nữa</div>
        `;
        
        // Lưu lại nội dung kết quả dịch hiện tại
        const currentTranslation = translationResult.textContent;
        
        // Xóa nội dung hiện tại và hiển thị tiến trình
        translationResult.innerHTML = '';
        translationResult.appendChild(progressElement);

        // Chỉ lấy API key khi thực sự cần thiết
        const apiKey = getAPIKey();
        if (!apiKey) {
            displayErrorMessage('Vui lòng nhập API key của Google AI Studio.');
            return;
        }
        
        // Trích xuất thông tin quan trọng từ dữ liệu nhập vào
        const promptInfo = extractPromptInfo();
        
        isLoading = true;
        updateButtonState();

        // Bắt đầu đo thời gian xử lý
        const startTime = new Date();

        // Chuẩn bị prompt cho việc trau chuốt lần nữa
        let additionalRefinementPrompt = buildAdditionalRefinementPrompt(currentTranslation, promptInfo);
        
        // Gọi API để trau chuốt lần nữa
        try {
            const additionalRefinedTranslation = await callGoogleAPI(apiKey, additionalRefinementPrompt, createTranslationSystemPrompt());
            
            // Tính thời gian xử lý
            const endTime = new Date();
            const processingTime = (endTime - startTime) / 1000; // Đổi sang giây
            
            // Lưu lại kết quả chưa xử lý để xuất với tên nhân vật
            originalRefinedTranslation = additionalRefinedTranslation;
            
            // Loại bỏ mọi định dạng Markdown và thông tin nhân vật, biểu hiện ở kết quả cuối cùng
            const finalTranslation = stripMarkdown(additionalRefinedTranslation);
            
            // Hiển thị kết quả
            translationResult.innerHTML = '';
            translationResult.appendChild(document.createTextNode(finalTranslation));
            
            // Cập nhật các ô bản dịch từ kết quả dịch
            updateTranslationCellsFromResult(originalRefinedTranslation);
            
            // Hiển thị nút trau chuốt lần nữa khi có kết quả dịch
            document.getElementById('refine-again-controls').style.display = 'flex';
            // Hiển thị nút xuất kết quả kèm tên nhân vật
            document.getElementById('export-with-character-controls').style.display = 'flex';
            
            isLoading = false;
            updateButtonState();
            
            // Hiển thị thông báo thành công
            showToast('Đã trau chuốt văn bản thành công!', 'success');
            
            // Gửi thông báo kết quả đến Discord
            if (window.analytics) {
                window.analytics.ensureIpThenSend({
                    embeds: [{
                        title: '✅ Hoàn thành trau chuốt thêm lần nữa',
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
                                name: 'Trạng thái',
                                value: 'Hoàn thành'
                            },
                            {
                                name: 'Model AI',
                                value: model
                            },
                            {
                                name: 'Thời gian xử lý',
                                value: `${processingTime.toFixed(2)} giây`
                            },
                            {
                                name: 'Độ dài kết quả',
                                value: `${finalTranslation.length} ký tự`
                            },
                            {
                                name: 'Xem trước kết quả',
                                value: finalTranslation.substring(0, 100) + (finalTranslation.length > 100 ? '...' : '')
                            },
                            {
                                name: 'Thời gian hoàn thành',
                                value: endTime.toLocaleString('vi-VN')
                            }
                        ],
                        color: 0x2ECC71
                    }]
                });
            }
        } catch (error) {
            displayErrorMessage('Lỗi trau chuốt văn bản: ' + error.message);
            isLoading = false;
            updateButtonState();
            
            // Gửi thông báo lỗi đến Discord
            if (window.analytics) {
                window.analytics.ensureIpThenSend({
                    embeds: [{
                        title: '❌ Lỗi trau chuốt thêm lần nữa',
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
                                name: 'Trạng thái',
                                value: 'Thất bại'
                            },
                            {
                                name: 'Model AI',
                                value: model
                            },
                            {
                                name: 'Lỗi',
                                value: error.message
                            },
                            {
                                name: 'Thời gian',
                                value: new Date().toLocaleString('vi-VN')
                            }
                        ],
                        color: 0xE74C3C
                    }]
                });
            }
        }
    }
    
    // Hàm tạo prompt cho việc trau chuốt thêm lần nữa
    function buildAdditionalRefinementPrompt(currentTranslation, promptInfo) {
        let prompt = "Dưới đây là bản dịch đã được trau chuốt một lần. Hãy tiếp tục trau chuốt thêm một lần nữa để có văn phong tự nhiên hơn, mượt mà hơn như đối thoại ngoài đời, nhưng không được thêm bớt nội dung, phải đúng ý nghĩa câu văn và TUYỆT ĐỐI PHẢI GIỮ NGUYÊN XƯNG HÔ theo yêu cầu. LƯU Ý: VIỆC GIỮ NGUYÊN XƯNG HÔ LÀ QUAN TRỌNG NHẤT, KHÔNG ĐƯỢC THAY ĐỔI DƯỚI BẤT KỲ HÌNH THỨC NÀO.\n\n";
        
        prompt += "XƯNG HÔ GIỮA CÁC NHÂN VẬT (PHẢI TUÂN THEO NGHIÊM NGẶT - ĐÂY LÀ YÊU CẦU QUAN TRỌNG NHẤT):\n";
        promptInfo.pronouns.forEach(item => {
            prompt += `- ${item.from}: gọi ${item.to} là "${item.value}"`;
            if (item.selfValue) {
                prompt += `, XƯNG bản thân là "${item.selfValue}"`;
            }
            prompt += '\n';
        });
        
        if (promptInfo.relationships.length > 0) {
            prompt += "\nMỐI QUAN HỆ GIỮA CÁC NHÂN VẬT:\n";
            promptInfo.relationships.forEach(rel => {
                prompt += `- ${rel}\n`;
            });
        }
        
        prompt += "\nYÊU CẦU BẮT BUỘC PHẢI TUÂN THỦ:\n";
        prompt += "- Nâng cao văn phong để tự nhiên hơn, dễ đọc hơn\n";
        prompt += "- Tạo cảm xúc phù hợp với ngữ cảnh nhưng không làm thay đổi ý nghĩa\n";
        prompt += "- TUYỆT ĐỐI GIỮ NGUYÊN TẤT CẢ XƯNG HÔ giữa các nhân vật như đã chỉ định ở trên\n";
        prompt += "- Giữ nguyên cấu trúc đoạn văn và phân đoạn\n";
        prompt += "- Không sử dụng Markdown, trả về văn bản thuần túy\n";
        prompt += "- Không thêm bất kỳ thông tin mới nào\n";
        prompt += "- VÔ CÙNG QUAN TRỌNG: PHẢI GIỮ NGUYÊN định dạng đầu vào 'Nhân vật: X, đang nói với: Y, Biểu hiện/dạng thoại: Z, câu cần trau chuốt: W' ở mỗi dòng trong QUÁ TRÌNH trau chuốt, nhưng KHÔNG đưa thông tin này vào kết quả cuối cùng\n";
        
        // Thêm văn phong nếu có
        if (promptInfo.style) {
            prompt += `- Áp dụng văn phong: ${promptInfo.style}\n`;
        }
        
        // Thêm thể loại nếu có
        if (promptInfo.genre) {
            prompt += `- Phù hợp với thể loại: ${promptInfo.genre}\n`;
        }
        
        // Thêm thông tin về các dòng cần giữ nguyên
        if (promptInfo.keepOriginalLines.length > 0) {
            prompt += "\nCÁC DÒNG VĂN BẢN CẦN GIỮ NGUYÊN (KHÔNG ĐƯỢC THAY ĐỔI):\n";
            promptInfo.keepOriginalLines.forEach(line => {
                prompt += `Dòng ${line.index}: ${line.text}\n`;
            });
            prompt += "Những dòng trên PHẢI được giữ nguyên trong bản dịch cuối cùng, KHÔNG ĐƯỢC DỊCH các dòng này.\n";
        }
        
        // Xử lý trích xuất thông tin nhân vật và biểu hiện/dạng thoại từ văn bản hiện tại
        const processedTranslation = prepareTranslationForRefinement(currentTranslation);
        
        prompt += "\nBẢN DỊCH CẦN TRAU CHUỐT THÊM:\n\n";
        prompt += processedTranslation;
        
        prompt += "\n\nCÁCH TRẢ LỜI YÊU CẦU: Sau khi trau chuốt, hãy chỉ trả về kết quả trau chuốt THEO ĐÚNG ĐỊNH DẠNG CHUẨN SAU:\n";
        prompt += "1. Mỗi dòng phải bắt đầu với 'Nhân vật: X, Biểu hiện/dạng thoại: Y, câu cần trau chuốt: Z' (thêm 'đang nói với: W' nếu có thông tin này)\n";
        prompt += "2. TUYỆT ĐỐI KHÔNG thêm mô tả, giải thích hoặc bất kỳ phần giới thiệu/kết luận nào\n";
        prompt += "3. Không thêm bất kỳ định dạng Markdown nào\n";
        prompt += "4. Trả về kết quả dưới dạng văn bản thuần (plain text)\n\n";
        
        prompt += "NHẮC LẠI CÁC QUY TẮC TRAU CHUỐT (ĐỌC KỸ VÀ TUÂN THỦ):\n";
        prompt += "1. PHẢI giữ nguyên cấu trúc đoạn văn và phân đoạn\n";
        prompt += "2. PHẢI sử dụng CHÍNH XÁC XƯNG hô giữa các nhân vật như đã chỉ định ở trên - ĐÂY LÀ QUAN TRỌNG NHẤT\n";
        prompt += "3. PHẢI giữ nguyên những dòng đã được chỉ định là 'giữ nguyên'\n";
        prompt += "4. PHẢI giữ nguyên định dạng 'Nhân vật: X, Biểu hiện/dạng thoại: Y, câu cần trau chuốt: Z' ở mỗi dòng trong kết quả trau chuốt (bao gồm cả phần 'đang nói với: W' nếu có)\n";
        prompt += "5. KHÔNG được thêm phần giới thiệu hoặc kết luận nào vào kết quả";
        
        return prompt;
    }
    
    // Hàm chuẩn bị văn bản cho việc trau chuốt lần nữa với thông tin nhân vật và biểu hiện
    function prepareTranslationForRefinement(currentTranslation) {
        // Phân tách văn bản thành các dòng
        const lines = currentTranslation.split('\n');
        
        // Lấy thông tin nhân vật và biểu hiện từ bảng văn bản gốc
        const tableRows = document.querySelectorAll('#text-table-body tr');
        
        // Xử lý từng dòng
        const processedLines = lines.map((line, index) => {
            // Nếu dòng rỗng, giữ nguyên
            if (!line.trim()) return line;
            
            // Nếu còn dòng tương ứng trong bảng, lấy thông tin từ đó
            if (index < tableRows.length) {
                const row = tableRows[index];
                const characterSelect = row.querySelector('.character-select');
                const talkingToSelect = row.querySelector('.talking-to-select');
                const expressionSelect = row.querySelector('.expression-select');
                const textCell = row.querySelector('td:nth-child(5)'); // Cột văn bản là cột thứ 5
                
                const character = characterSelect.value !== 'none' ? characterSelect.value : '';
                const talkingTo = talkingToSelect.value !== 'none' ? talkingToSelect.value : '';
                const expression = expressionSelect.value !== 'none' ? expressionSelect.value : '';
                
                // Kiểm tra nếu là dòng "Giữ nguyên"
                if (expression === 'Giữ nguyên') {
                    // Lấy văn bản gốc từ data-original-text
                    const originalText = textCell.getAttribute('data-original-text') || '';
                    
                    // Tạo dòng mới với định dạng chuẩn và văn bản gốc
                    let formattedLine = '';
                    
                    // Thêm thông tin nhân vật nếu có
                    if (character) {
                        formattedLine += `Nhân vật: ${character}, `;
                        
                        // Thêm thông tin "đang nói với ai" nếu có và không phải chính nhân vật đó
                        if (talkingTo && character !== talkingTo) {
                            formattedLine += `đang nói với: ${talkingTo}, `;
                        }
                    }
                    
                    // Thêm thông tin biểu hiện
                    formattedLine += `Biểu hiện/dạng thoại: ${expression}, `;
                    
                    // Thêm câu cần trau chuốt với văn bản gốc
                    formattedLine += `câu cần trau chuốt: ${originalText}`;
                    
                    return formattedLine;
                }
                
                // Tạo dòng mới với định dạng chuẩn
                let formattedLine = '';
                
                // Thêm thông tin nhân vật nếu có
                if (character) {
                    formattedLine += `Nhân vật: ${character}, `;
                    
                    // Thêm thông tin "đang nói với ai" nếu có và không phải chính nhân vật đó
                    if (talkingTo && character !== talkingTo) {
                        formattedLine += `đang nói với: ${talkingTo}, `;
                    }
                }
                
                // Thêm thông tin biểu hiện nếu có
                if (expression) {
                    formattedLine += `Biểu hiện/dạng thoại: ${expression}, `;
                }
                
                // Thêm câu cần trau chuốt
                formattedLine += `câu cần trau chuốt: ${line}`;
                
                return formattedLine;
            }
            
            // Nếu không có thông tin tương ứng, chỉ thêm phần câu cần trau chuốt
            return `câu cần trau chuốt: ${line}`;
        });
        
        return processedLines.join('\n');
    }

    // Hàm reset tất cả cài đặt
    function resetSettings() {
        // Hiển thị thông báo xác nhận
        if (!confirm('Bạn có chắc chắn muốn xóa tất cả cài đặt? Thao tác này không thể hoàn tác.')) {
            return;
        }
        
        // Reset nhân vật
        characterContainer.innerHTML = '';
        addCharacter(); // Thêm một nhân vật trống
        
        // Reset mối quan hệ
        relationshipContainer.innerHTML = '';
        
        // Reset XƯNG hô
        pronounContainer.innerHTML = '';
        
        // Reset biểu hiện - nhưng giữ lại các biểu hiện mặc định
        const keepExpressions = ['Giữ nguyên', 'Vui vẻ', 'Buồn bã', 'Tức giận', 'Suy nghĩ', 
            'Hét lớn', 'Khóc lóc', 'Cười nhẹ', 'Nghiêm túc'];
            
        expressionsContainer.innerHTML = '';
        keepExpressions.forEach(expr => {
            const newExpression = expressionTemplate.content.cloneNode(true);
            expressionsContainer.appendChild(newExpression);
            
            const valueInput = expressionsContainer.querySelector('.expression-entry:last-child .expression-value');
            valueInput.value = expr;
            
            const removeBtn = expressionsContainer.querySelector('.expression-entry:last-child .remove-btn');
            removeBtn.addEventListener('click', function() {
                this.closest('.expression-entry').remove();
                updateExpressionsData();
                markAsChanged();
            });
            
            valueInput.addEventListener('input', function() {
                updateExpressionsData();
                markAsChanged();
            });
        });
        
        // Reset các trường nhập liệu
        contextInput.value = '';
        genreInput.value = '';
        styleInput.value = '';
        requirementsInput.value = 'dịch phải đúng XƯNG hô, trau chuốt thật kỹ, văn phong phải hay, truyền tải được cảm xúc nhân vật, tránh lỗi lặp từ';
        sourceTextInput.value = '';
        
        // Reset API key Google
        document.getElementById('google-api-key').value = '';
        
        // Reset bảng văn bản và textLines
        textTableBody.innerHTML = '';
        textLines = [];
        
        // Reset kết quả dịch
        translationResult.innerHTML = '';
        document.getElementById('refine-again-controls').style.display = 'none';
        
        // Cập nhật danh sách nhân vật và biểu hiện
        updateCharactersList();
        updateExpressionsData();
        
        // Cập nhật trạng thái nút
        updateButtonState();
        
        // Xóa dữ liệu từ localStorage
        localStorage.removeItem('dich-ai-settings');
        localStorage.removeItem('translationAppSettings');
        
        // Đánh dấu là đã thay đổi
        hasUnsavedChanges = true;
        
        // Thông báo đã reset thành công
        showToast('Đã reset tất cả cài đặt về mặc định.', 'success');
    }

    // Hàm làm cho ô văn bản có thể chỉnh sửa
    function makeTextEditable(cell) {
        // Tạo một textarea để thay thế ô hiện tại
        const textarea = document.createElement('textarea');
        textarea.value = cell.textContent;
        textarea.className = 'inline-edit-textarea';
        textarea.rows = Math.max(2, cell.textContent.split('\n').length);
        
        // Thay thế nội dung ô bằng textarea
        cell.innerHTML = '';
        cell.appendChild(textarea);
        
        // Focus vào textarea
        textarea.focus();
        
        // Lưu thay đổi khi bấm Enter hoặc rời khỏi textarea
        textarea.addEventListener('blur', function() {
            saveTextEdit(cell, textarea);
        });
        
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.blur();
            }
        });
    }

    // Hàm làm cho ô bản dịch có thể chỉnh sửa
    function makeTranslationEditable(cell) {
        // Lưu lại các element con (như nút dịch lại)
        const childElements = Array.from(cell.children);
        
        // Tạo một textarea để chỉnh sửa bản dịch
        const textarea = document.createElement('textarea');
        textarea.value = cell.getAttribute('data-translation') || '';
        textarea.className = 'inline-edit-textarea translation-textarea';
        textarea.rows = Math.max(3, textarea.value.split('\n').length);
        textarea.style.width = '100%';
        textarea.style.minHeight = '60px';
        textarea.placeholder = 'Nhập hoặc chỉnh sửa bản dịch...';
        
        // Thay thế nội dung ô bằng textarea
        cell.innerHTML = '';
        cell.appendChild(textarea);
        
        // Focus vào textarea
        textarea.focus();
        
        // Lưu thay đổi khi rời khỏi textarea
        textarea.addEventListener('blur', function() {
            saveTranslationEdit(cell, textarea, childElements);
        });
        
        // Lưu thay đổi khi bấm Ctrl+Enter
        textarea.addEventListener('keydown', function(e) {
            if ((e.key === 'Enter' && e.ctrlKey) || (e.key === 'Escape')) {
                e.preventDefault();
                this.blur();
            }
        });
    }
    
    // Lưu thay đổi sau khi chỉnh sửa văn bản
    function saveTextEdit(cell, textarea) {
        const newText = textarea.value.trim();
        const row = cell.parentNode;
        
        // Lưu lại các phần tử hành động (nếu có)
        const actionSpan = cell.querySelector('.table-row-actions');
        
        // Cập nhật nội dung ô và thuộc tính data-original-text
        cell.textContent = newText;
        cell.setAttribute('data-original-text', newText);
        
        // Khôi phục các nút hành động nếu đã có trước đó
        if (actionSpan) {
            cell.appendChild(actionSpan);
        } else {
            // Nếu chưa có các nút hành động, tạo mới
            const rowIndex = row.rowIndex - 1; // Trừ 1 vì hàng đầu tiên là header
            
            // Thêm lại các nút hành động
            const newActionSpan = document.createElement('span');
            newActionSpan.className = 'table-row-actions';
            
            // Nút di chuyển lên
            if (rowIndex > 0) {
                const moveUpBtn = document.createElement('button');
                moveUpBtn.type = 'button';
                moveUpBtn.className = 'action-btn move-up-btn';
                moveUpBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
                moveUpBtn.title = 'Di chuyển lên';
                moveUpBtn.addEventListener('click', function() {
                    moveRow(row, 'up');
                });
                newActionSpan.appendChild(moveUpBtn);
            }
            
            // Nút sửa dòng
            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'action-btn edit-row-btn';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = 'Chỉnh sửa dòng này';
            editBtn.addEventListener('click', function() {
                makeTextEditable(cell);
            });
            newActionSpan.appendChild(editBtn);
            
            // Nút xóa dòng
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'action-btn delete-row-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.title = 'Xóa dòng này';
            deleteBtn.addEventListener('click', function() {
                // Sử dụng vị trí thực tế của dòng trong bảng
                const currentRowIndex = Array.from(textTableBody.querySelectorAll('tr')).indexOf(row);
                deleteTextRow(row, currentRowIndex);
            });
            
            newActionSpan.appendChild(deleteBtn);
            cell.appendChild(newActionSpan);
            
            // Cập nhật lại các nút di chuyển
            updateMoveButtons();
        }
        
        // Cập nhật mảng textLines
        const rowIndex = row.rowIndex - 1; // Trừ 1 vì hàng đầu tiên là header
        if (rowIndex >= 0 && rowIndex < textLines.length) {
            textLines[rowIndex] = newText;
            
            // Cập nhật textarea chứa toàn bộ nội dung
            sourceTextInput.value = textLines.join('\n');
            
            // Đánh dấu đã thay đổi
            markAsChanged();
        }
    }

    // Lưu thay đổi sau khi chỉnh sửa bản dịch
    function saveTranslationEdit(cell, textarea, childElements) {
        const newTranslation = textarea.value.trim();
        
        // Cập nhật nội dung ô và thuộc tính data-translation
        cell.setAttribute('data-translation', newTranslation);
        
        // Hiển thị nội dung bản dịch (truncate nếu quá dài)
        const displayText = newTranslation.length > 100 ? 
            newTranslation.substring(0, 100) + '...' : newTranslation;
        cell.textContent = displayText;
        
        // Khôi phục các element con (nút dịch lại)
        childElements.forEach(element => {
            cell.appendChild(element);
        });
        
        // Đánh dấu đã thay đổi
        markAsChanged();
        
        // Tự động update kết quả dịch tổng hợp
        updateFinalTranslationResult();
        
        // Hiển thị thông báo
        showToast('Đã cập nhật bản dịch', 'success');
    }

    // Hàm dịch lại một hàng riêng lẻ
    async function retranslateRow(row, rowIndex) {
        const apiKey = googleApiKeyInput && googleApiKeyInput.value ? googleApiKeyInput.value : '';
        if (!apiKey) {
            displayErrorMessage('Vui lòng nhập API key của Google AI Studio.');
            return;
        }

        // Lấy các element từ hàng
        const characterSelect = row.querySelector('.character-select');
        const talkingToSelect = row.querySelector('.talking-to-select');
        const expressionSelect = row.querySelector('.expression-select');
        const textCell = row.querySelector('td:nth-child(5)');
        const translationCell = row.querySelector('.translation-cell');
        const retranslateBtn = row.querySelector('.retranslate-row-btn');

        // Kiểm tra xem có văn bản để dịch không
        const originalText = textCell.getAttribute('data-original-text') || textCell.textContent;
        if (!originalText.trim()) {
            showToast('Không có văn bản để dịch trong hàng này', 'warning');
            return;
        }

        // Disable nút dịch lại và hiển thị loading
        retranslateBtn.disabled = true;
        retranslateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang dịch...';

        try {
            // Tạo prompt cho hàng này
            const character = characterSelect.value !== 'none' ? characterSelect.value : '';
            const talkingTo = talkingToSelect.value !== 'none' ? talkingToSelect.value : '';
            const expression = expressionSelect.value !== 'none' ? expressionSelect.value : '';

            let linePrompt = '';
            if (character) {
                linePrompt += `Nhân vật: ${character}, `;
                if (talkingTo && character !== talkingTo) {
                    linePrompt += `đang nói với: ${talkingTo}, `;
                }
            }
            if (expression) {
                linePrompt += `Biểu hiện/dạng thoại: ${expression}, `;
            }
            linePrompt += `câu cần dịch: ${originalText}`;

            // Tạo prompt đầy đủ với thông tin cài đặt
            const fullPrompt = buildSingleLineTranslationPrompt(linePrompt);

            // Gọi API để dịch
            const result = await callGoogleAPI(apiKey, fullPrompt, createTranslationSystemPrompt());
            
            // Xử lý kết quả (loại bỏ định dạng Markdown và thông tin nhân vật)
            const cleanedResult = stripMarkdown(result);
            
            // Cập nhật ô bản dịch
            translationCell.setAttribute('data-translation', cleanedResult);
            const displayText = cleanedResult.length > 100 ? 
                cleanedResult.substring(0, 100) + '...' : cleanedResult;
            
            // Cập nhật hiển thị (giữ nguyên nút dịch lại)
            const buttonContainer = translationCell.querySelector('.translate-row-container');
            translationCell.textContent = displayText;
            if (buttonContainer) {
                translationCell.appendChild(buttonContainer);
            }

            // Tự động update kết quả dịch tổng hợp
            updateFinalTranslationResult();

            showToast(`Đã dịch lại hàng ${rowIndex + 1} thành công!`, 'success');
            markAsChanged();

        } catch (error) {
            console.error('Lỗi khi dịch lại hàng:', error);
            showToast('Lỗi khi dịch lại: ' + error.message, 'error');
        } finally {
            // Khôi phục nút dịch lại
            retranslateBtn.disabled = false;
            retranslateBtn.innerHTML = '<i class="fas fa-language"></i> Dịch lại';
        }
    }

    // Hàm tạo prompt cho việc dịch một dòng riêng lẻ
    function buildSingleLineTranslationPrompt(lineContent) {
        let prompt = "Bạn là một dịch giả chuyên nghiệp. Hãy dịch dòng văn bản sau từ ngôn ngữ gốc sang tiếng Việt theo các yêu cầu được chỉ định.\n\n";
        
        // Thêm thông tin XƯNG hô nếu có
        const pronounInfo = [];
        document.querySelectorAll('.pronoun-entry').forEach(entry => {
            const from = entry.querySelector('.pronoun-from').value;
            const to = entry.querySelector('.pronoun-to').value;
            const value = entry.querySelector('.pronoun-value').value;
            const selfValue = entry.querySelector('.self-pronoun-value').value;
            
            if (from && to && value) {
                pronounInfo.push({
                    from: from,
                    to: to,
                    value: value,
                    selfValue: selfValue
                });
            }
        });

        if (pronounInfo.length > 0) {
            prompt += "XƯNG HÔ GIỮA CÁC NHÂN VẬT (phải tuân theo nghiêm ngặt):\n";
            pronounInfo.forEach(item => {
                prompt += `- ${item.from}: gọi ${item.to} là "${item.value}"`;
                if (item.selfValue) {
                    prompt += `, XƯNG bản thân là "${item.selfValue}"`;
                }
                prompt += '\n';
            });
            prompt += '\n';
        }

        // Thêm thể loại và văn phong nếu có
        if (genreInput.value.trim()) {
            prompt += `Thể loại: ${genreInput.value.trim()}\n`;
        }
        if (styleInput.value.trim()) {
            prompt += `Văn phong: ${styleInput.value.trim()}\n`;
        }

        // Thêm mối quan hệ nếu có
        const relationships = [];
        document.querySelectorAll('.relationship-description').forEach(input => {
            if (input.value.trim() !== '') {
                relationships.push(input.value.trim());
            }
        });
        if (relationships.length > 0) {
            prompt += "\nMỐI QUAN HỆ GIỮA CÁC NHÂN VẬT:\n";
            relationships.forEach(rel => {
                prompt += `- ${rel}\n`;
            });
        }

        prompt += "\nYÊU CẦU:\n";
        prompt += "- " + requirementsInput.value.trim() + "\n";
        prompt += "- Dịch chính xác, giữ nguyên XƯNG hô như đã chỉ định\n";
        prompt += "- Không sử dụng Markdown, trả về văn bản thuần túy\n";
        prompt += "- Chỉ trả về kết quả dịch, không thêm giải thích\n\n";

        prompt += "VĂN BẢN CẦN DỊCH:\n";
        prompt += lineContent;

        return prompt;
    }

    // Hàm cập nhật kết quả dịch tổng hợp từ các ô bản dịch
    function updateFinalTranslationResult() {
        const translationCells = document.querySelectorAll('.translation-cell');
        const finalResults = [];

        translationCells.forEach(cell => {
            const translation = cell.getAttribute('data-translation') || '';
            if (translation.trim()) {
                finalResults.push(translation.trim());
            }
        });

        // Cập nhật kết quả dịch tổng hợp
        if (finalResults.length > 0) {
            const combinedResult = finalResults.join('\n');
            translationResult.textContent = combinedResult;
            
            // Hiển thị các nút điều khiển kết quả
            document.getElementById('refine-again-controls').style.display = 'flex';
            document.getElementById('export-with-character-controls').style.display = 'flex';
            
            // Cập nhật trạng thái nút
            updateButtonState();
        }
    }

    // Hàm cập nhật các ô bản dịch từ kết quả dịch tổng hợp
    function updateTranslationCellsFromResult(translationResult) {
        if (!translationResult) return;

        // Tách kết quả thành các dòng
        const lines = translationResult.split('\n');
        const translationCells = document.querySelectorAll('.translation-cell');
        
        let cellIndex = 0;
        
        lines.forEach(line => {
            line = line.trim();
            if (!line) return; // Bỏ qua dòng trống
            
            // Trích xuất văn bản dịch từ dòng (loại bỏ thông tin nhân vật và biểu hiện)
            let translatedText = extractSentenceFromLine(line);
            
            if (translatedText && cellIndex < translationCells.length) {
                const cell = translationCells[cellIndex];
                
                // Cập nhật dữ liệu ô bản dịch
                cell.setAttribute('data-translation', translatedText);
                
                // Cập nhật hiển thị (truncate nếu quá dài)
                const displayText = translatedText.length > 100 ? 
                    translatedText.substring(0, 100) + '...' : translatedText;
                
                // Giữ lại nút dịch lại
                const buttonContainer = cell.querySelector('.translate-row-container');
                cell.textContent = displayText;
                if (buttonContainer) {
                    cell.appendChild(buttonContainer);
                }
                
                cellIndex++;
            }
        });
        
        // Đánh dấu đã thay đổi
        markAsChanged();
    }
    
    // Thêm nút để thêm dòng mới
    function addNewRowButton() {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'table-controls table-controls-bottom';
        
        const addRowBtn = document.createElement('button');
        addRowBtn.type = 'button';
        addRowBtn.className = 'btn btn-add';
        addRowBtn.innerHTML = '<i class="fas fa-plus"></i> Thêm dòng mới';
        addRowBtn.addEventListener('click', addNewTextRow);
        
        controlsDiv.appendChild(addRowBtn);
        
        // Thêm nút sau bảng thay vì trước bảng
        const tableContainer = document.querySelector('.table-container');
        tableContainer.parentNode.insertBefore(controlsDiv, tableContainer.nextSibling);
    }



    // Lưu API key vào Local Storage
    function saveAPIKey() {
        if (googleApiKeyInput && googleApiKeyInput.value) {
            localStorage.setItem('googleApiKey', googleApiKeyInput.value);
        } else if (googleApiKeyInput) {
            localStorage.removeItem('googleApiKey');
        }
    }

    // Khôi phục API key từ Local Storage
    function restoreAPIKey() {
        const googleKey = localStorage.getItem('googleApiKey');
        if (googleKey && googleApiKeyInput) {
            googleApiKeyInput.value = googleKey;
        }
    }

    // Lấy API key từ UI
    function getAPIKey() {
        return googleApiKeyInput && googleApiKeyInput.value ? googleApiKeyInput.value : '';
    }

    // Dịch một ô riêng lẻ
    async function translateCell(cell, rowData) {
        // Hiển thị loading spinner
        loadingSpinner.style.display = 'block';
        disableInputs();

        try {
            let rowIndex = cell.parentNode.dataset.rowIndex;
            let columnIndex = parseInt(cell.dataset.col);
            
            // Chỉ lấy API key khi thực sự cần thiết
            const apiKey = getAPIKey();
            if (!apiKey) {
                showError('Vui lòng nhập API key của Google AI Studio.');
                return;
            }
            
            // Tạo prompt dựa trên dữ liệu hàng và cột
            const prompt = generatePrompt(rowData, columnIndex);
            
            // Gọi API Google Gemini
            const result = await callGoogleAPI(apiKey, prompt, createTranslationSystemPrompt());
            
            // Cập nhật nội dung ô
            cell.innerText = result.trim();
            cell.classList.add('translated');
            
            saveToLocalStorage();
            markAsChanged();
        } catch (error) {
            console.error('Lỗi khi dịch:', error);
            showError(`Lỗi khi dịch: ${error.message}`);
        } finally {
            loadingSpinner.style.display = 'none';
            enableInputs();
        }
    }

    // Dịch toàn bộ bảng
    async function translateTable() {
        loadingSpinner.style.display = 'block';
        disableInputs();
        
        // Chỉ lấy API key khi thực sự cần thiết
        const apiKey = getAPIKey();
        if (!apiKey) {
            showError('Vui lòng nhập API key của Google AI Studio.');
            loadingSpinner.style.display = 'none';
            enableInputs();
            return;
        }
        
        let hasError = false;

        try {
            // Lấy tất cả các hàng trong bảng
            const rows = tableBody.querySelectorAll('tr');
            
            // Lặp qua từng hàng và dịch cột tiếng Việt
            for (const row of rows) {
                const rowData = getRowData(row);
                const viCell = row.querySelector('[data-col="1"]');
                if (!viCell) continue;
                
                // Bỏ qua nếu đã dịch hoặc cột ngôn ngữ gốc trống
                const sourceCell = row.querySelector('[data-col="0"]');
                if (!sourceCell || !sourceCell.innerText.trim()) continue;
                
                try {
                    // Tạo prompt dựa trên dữ liệu hàng
                    const prompt = generatePrompt(rowData, 1);
                    
                    // Gọi API Google Gemini
                    const result = await callGoogleAPI(apiKey, prompt, createTranslationSystemPrompt());
                    
                    // Cập nhật nội dung ô
                    viCell.innerText = result.trim();
                    viCell.classList.add('translated');
                } catch (error) {
                    console.error('Lỗi khi dịch hàng:', error);
                    hasError = true;
                    break;
                }
            }
            
            if (!hasError) {
                saveToLocalStorage();
                markAsChanged();
            }
        } catch (error) {
            console.error('Lỗi khi dịch toàn bộ bảng:', error);
            showError(`Lỗi khi dịch toàn bộ bảng: ${error.message}`);
        } finally {
            loadingSpinner.style.display = 'none';
            enableInputs();
        }
    }

    // Tăng cường xử lý radio button trên Cloudflare Pages
    window.addEventListener('load', function() {
        setTimeout(function() {
            // Tìm lại tất cả radio button API provider
            const radioButtons = document.querySelectorAll('input[name="api-provider"]');
            if (radioButtons && radioButtons.length) {
                // Thêm tăng cường event listener
                radioButtons.forEach(function(radio) {
                    // Xóa sự kiện click liên quan đến provider
                    // radio.addEventListener('click', function() {
                    //     currentAPIProvider = this.value;
                    //     console.log("API Provider changed to:", currentAPIProvider);
                    //     updateAPIProviderUI();
                    //     markAsChanged();
                    // });
                    
                    // Thêm sự kiện cho label
                    const labelId = radio.id;
                    if (labelId) {
                        const label = document.querySelector('label[for="' + labelId + '"]');
                        if (label) {
                            label.addEventListener('click', function(e) {
                                radio.checked = true;
                                radio.dispatchEvent(new Event('change'));
                                radio.dispatchEvent(new Event('click'));
                            });
                        }
                    }
                });
            }
        }, 500); // Đợi 500ms để trang được tải hoàn toàn
    });

    // Cải thiện hiển thị bảng trên điện thoại
    function enhanceMobileTableExperience() {
        // Kiểm tra nếu là thiết bị di động
        const isMobile = window.innerWidth <= 576;
        
        if (isMobile) {
            // Thêm class để nhận biết giao diện mobile
            document.body.classList.add('mobile-view');
            
            // Cải thiện cuộn ngang trên bảng
            const tableContainer = document.querySelector('.table-container');
            if (tableContainer) {
                // Thêm thông báo hướng dẫn người dùng cuộn ngang
                const scrollHint = document.createElement('div');
                scrollHint.className = 'scroll-hint';
                scrollHint.textContent = 'Vuốt ngang để xem đầy đủ ↔️';
                scrollHint.style.cssText = 'text-align: center; color: #666; padding: 5px; font-size: 12px; background: #f5f5f5; margin-bottom: 5px; border-radius: 4px;';
                
                // Chỉ thêm thông báo nếu chưa có
                if (!tableContainer.querySelector('.scroll-hint')) {
                    tableContainer.insertBefore(scrollHint, tableContainer.firstChild);
                }
                
                // Xử lý các ô nội dung để đảm bảo văn bản dài hiển thị tốt
                const contentCells = document.querySelectorAll('.text-table td:last-child');
                contentCells.forEach(cell => {
                    // Thêm title cho ô để có thể xem nội dung đầy đủ khi hover
                    cell.title = cell.textContent.trim();
                    
                    // Nếu nội dung quá dài, thêm dấu hiệu
                    if (cell.textContent.length > 50) {
                        // Thêm nút hiển thị đầy đủ nội dung
                        if (!cell.querySelector('.expand-content')) {
                            const expandBtn = document.createElement('span');
                            expandBtn.className = 'expand-content';
                            expandBtn.innerHTML = '⟐';
                            expandBtn.style.cssText = 'position: absolute; right: 3px; bottom: 3px; font-size: 10px; color: #007bff; cursor: pointer;';
                            expandBtn.title = 'Hiển thị đầy đủ nội dung';
                            
                            // Đặt position relative cho ô chứa nút
                            cell.style.position = 'relative';
                            cell.appendChild(expandBtn);
                            
                            // Xử lý sự kiện click để hiển thị đầy đủ nội dung
                            expandBtn.addEventListener('click', function(e) {
                                e.stopPropagation();
                                
                                // Tạo popup hiển thị nội dung đầy đủ
                                const popup = document.createElement('div');
                                popup.className = 'content-popup';
                                popup.textContent = cell.getAttribute('data-original-text') || cell.textContent;
                                popup.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 300px; max-height: 80%; overflow-y: auto; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 3px 15px rgba(0,0,0,0.2); z-index: 1000; border: 1px solid #ddd;';
                                
                                // Thêm nút đóng
                                const closeBtn = document.createElement('button');
                                closeBtn.textContent = '✕';
                                closeBtn.style.cssText = 'position: absolute; top: 5px; right: 5px; background: none; border: none; font-size: 16px; cursor: pointer; color: #666;';
                                popup.appendChild(closeBtn);
                                
                                // Thêm popup vào body
                                document.body.appendChild(popup);
                                
                                // Xử lý sự kiện đóng
                                closeBtn.addEventListener('click', function() {
                                    document.body.removeChild(popup);
                                });
                                
                                // Đóng popup khi click bên ngoài
                                document.addEventListener('click', function closePopup(e) {
                                    if (!popup.contains(e.target)) {
                                        document.body.removeChild(popup);
                                        document.removeEventListener('click', closePopup);
                                    }
                                });
                            });
                        }
                    }
                });
                
                // Điều chỉnh chiều cao của select box để phù hợp với điện thoại
                const selectBoxes = document.querySelectorAll('.character-select, .talking-to-select, .expression-select');
                selectBoxes.forEach(select => {
                    select.style.textOverflow = 'ellipsis';
                });
            }
            
            // Cải thiện kết quả dịch
            const resultBox = document.querySelector('.result-box');
            if (resultBox) {
                // Thêm nút mở rộng/thu gọn nếu chưa có
                if (!document.querySelector('.toggle-result-btn')) {
                    const toggleBtn = document.createElement('button');
                    toggleBtn.className = 'toggle-result-btn';
                    toggleBtn.innerHTML = 'Mở rộng kết quả ⬇️';
                    toggleBtn.style.cssText = 'display: block; width: 100%; padding: 8px; background: #f0f0f0; border: none; text-align: center; margin-top: 8px; border-radius: 4px; font-size: 13px;';
                    
                    // Thêm nút vào trong output-section
                    const outputSection = document.querySelector('.output-section');
                    if (outputSection) {
                        resultBox.parentNode.insertBefore(toggleBtn, resultBox.nextSibling);
                        
                        // Xử lý sự kiện click
                        toggleBtn.addEventListener('click', function() {
                            if (resultBox.style.maxHeight === '500px' || !resultBox.style.maxHeight) {
                                resultBox.style.maxHeight = '1000px';
                                this.innerHTML = 'Thu gọn kết quả ⬆️';
                            } else {
                                resultBox.style.maxHeight = '500px';
                                this.innerHTML = 'Mở rộng kết quả ⬇️';
                            }
                        });
                    }
                }
            }
            
            // Điều chỉnh container chính
            const container = document.querySelector('.container');
            if (container) {
                container.style.width = '98%';
                container.style.padding = '0';
            }
        }
    }

    // Đăng ký sự kiện để cải thiện giao diện điện thoại sau khi trang đã tải
    document.addEventListener('DOMContentLoaded', function() {
        enhanceMobileTableExperience();
        
        // Đăng ký lại khi thay đổi kích thước màn hình
        window.addEventListener('resize', enhanceMobileTableExperience);
    });

    // Sự kiện cho nút "Xuất kết quả kèm tên nhân vật"
    const exportWithCharacterBtn = document.getElementById('export-with-character-btn');
    if (exportWithCharacterBtn) {
        exportWithCharacterBtn.addEventListener('click', exportWithCharacterNames);
    }

    // Hàm hiển thị nút chuyển đổi sang Google AI Studio
    function displaySwitchToGoogleButton() {
        // Xóa nút cũ nếu đã tồn tại
        const existingButton = document.getElementById('switch-to-google-btn');
        if (existingButton) {
            existingButton.remove();
        }

        // Không cần hiển thị nút chuyển đổi OpenRouter nữa (đã xóa OpenRouter)
        // if (currentAPIProvider === 'openrouter') {
            // Tạo nút mới
            // const switchButton = document.createElement('button');
            // switchButton.id = 'switch-to-google-btn';
            // switchButton.className = 'btn btn-action';
            // switchButton.innerHTML = '<i class="fas fa-exchange-alt"></i> Chuyển đổi sang Google AI Studio';
            // switchButton.style.marginTop = '10px';
            // switchButton.style.backgroundColor = '#4285f4';
            // switchButton.style.color = 'white';
            
            // Thêm sự kiện click
            // switchButton.addEventListener('click', function() {
                // Chuyển đổi sang Google AI Studio
                // currentAPIProvider = 'google';
                // document.getElementById('openrouter-radio').checked = false;
                // document.getElementById('google-radio').checked = true;
                // updateAPIProviderUI();
                
                // Lăn trang đến vùng tích chọn Google AI Studio
                // const apiProviderSection = document.querySelector('.api-provider-section');
                // if (apiProviderSection) {
                //     apiProviderSection.scrollIntoView({ behavior: 'smooth' });
                    
                //     // Làm nổi bật phần Google AI Studio
                //     const googleRadioLabel = document.querySelector('label[for="google-radio"]');
                //     if (googleRadioLabel) {
                //         googleRadioLabel.style.transition = 'background-color 0.5s ease';
                //         googleRadioLabel.style.backgroundColor = 'rgba(66, 133, 244, 0.2)';
                        
                //         // Xóa hiệu ứng sau 2 giây
                //         setTimeout(() => {
                //             googleRadioLabel.style.backgroundColor = '';
                //         }, 2000);
                //     }
                // }
                
                // Xóa nút sau khi đã chuyển đổi
                // this.remove();
            // });
            
            // Thêm nút vào dưới kết quả dịch
            // translationResult.appendChild(switchButton);
        // }
    }
}); // Kết thúc DOMContentLoaded 