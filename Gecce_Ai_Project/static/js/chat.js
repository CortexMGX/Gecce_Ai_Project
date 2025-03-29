document.addEventListener('DOMContentLoaded', () => {
    // Slider değerlerini güncelle
    function setupSliders() {
        const sliders = [
            { id: 'cpu-threads', output: 'cpu-threads-value' },
            { id: 'n-ctx', output: 'n-ctx-value' },
            { id: 'max-tokens', output: 'max-tokens-value' },
            { id: 'n-batch', output: 'n-batch-value' },
            { id: 'temperature', output: 'temperature-value' },
            { id: 'top-p', output: 'top-p-value' },
            { id: 'top-k', output: 'top-k-value' }
        ];

        sliders.forEach(slider => {
            const element = document.getElementById(slider.id);
            const output = document.getElementById(slider.output);
            
            // Başlangıç değerini ayarla
            output.textContent = element.value;
            
            // Değişiklikleri dinle
            element.addEventListener('input', () => {
                output.textContent = element.value;
            });
        });
    }

    // Model yükleme
    document.getElementById('load-model').addEventListener('click', async () => {
        const modelFullText = document.getElementById('model-select').value;
        const modelName = modelFullText.split(' (')[0];
        const loadBtn = document.getElementById('load-model');
        
        if (!modelName) {
            alert('Lütfen geçerli bir model seçin!');
            return;
        }

        loadBtn.disabled = true;
        loadBtn.textContent = 'Yükleniyor...';

        try {
            const settings = {
                cpu_threads: document.getElementById('cpu-threads').value,
                n_ctx: document.getElementById('n-ctx').value,
                max_tokens: document.getElementById('max-tokens').value,
                n_batch: document.getElementById('n-batch').value,
                use_mmap: document.getElementById('use-mmap').checked,
                use_mlock: document.getElementById('use-mlock').checked,
                use_flash: document.getElementById('use-flash').checked,
                keep_in_memory: document.getElementById('keep-in-memory').checked,
                temperature: document.getElementById('temperature').value,
                top_p: document.getElementById('top-p').value,
                top_k: document.getElementById('top-k').value
            };

            const response = await fetch('/load_model', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    model_name: modelName,
                    ...settings
                })
            });

            const data = await response.json();
            
            if (data.success) {
                document.getElementById('model-info').innerHTML = `
                    <p><strong>Model:</strong> ${data.model_info.name}</p>
                    <p><strong>Boyut:</strong> ${data.model_info.size}</p>
                    <p><strong>Threads:</strong> ${data.model_info.settings.n_threads}</p>
                    <p><strong>Bağlam:</strong> ${data.model_info.settings.n_ctx} token</p>
                `;
                
                document.getElementById('user-input').disabled = false;
                document.getElementById('send-button').disabled = false;
                
                addMessage('ai', `Gecce Ai 7b v1.37 modeli başarıyla yüklendi! Size nasıl yardımcı olabilirim?`);
            } else {
                alert(`Hata: ${data.message}`);
            }
        } catch (error) {
            alert(`Bağlantı hatası: ${error.message}`);
        } finally {
            loadBtn.disabled = false;
            loadBtn.textContent = 'Modeli Yükle';
        }
    });

    // Mesaj gönderme
    document.getElementById('send-button').addEventListener('click', sendMessage);
    document.getElementById('user-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function sendMessage() {
        const userInput = document.getElementById('user-input');
        const message = userInput.value.trim();
        if (!message) return;

        addMessage('user', message);
        userInput.value = '';

        const settings = {
            max_tokens: document.getElementById('max-tokens').value,
            temperature: document.getElementById('temperature').value,
            top_p: document.getElementById('top-p').value,
            top_k: document.getElementById('top-k').value
        };

        fetch('/get_response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                message: message,
                ...settings
            })
        })
        .then(response => response.json())
        .then(data => {
            addMessage('ai', data.response);
        })
        .catch(error => {
            addMessage('ai', `Hata: ${error.message}`);
        });
    }

    function addMessage(sender, text) {
        const messagesDiv = document.getElementById('chat-messages');
        const msgDiv = document.createElement('div');
        msgDiv.className = `${sender}-message message`;
        msgDiv.textContent = text;
        messagesDiv.appendChild(msgDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Sliderları başlat
    setupSliders();
});
