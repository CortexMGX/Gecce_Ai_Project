from flask import Flask, render_template, request, jsonify, send_from_directory
from llama_cpp import Llama
import os
import logging
import multiprocessing

app = Flask(__name__)
app.static_folder = 'static'
app.template_folder = 'templates'

# Loglama ayarı
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Sistem bilgilerini al
def get_system_info():
    return {
        'cpu_threads': multiprocessing.cpu_count(),
        'max_ctx': 131072,
        'max_tokens': 131072
    }

# Varsayılan ayarlar
DEFAULT_SETTINGS = {
    'cpu_threads': max(1, multiprocessing.cpu_count() // 2),
    'n_ctx': 2048,
    'max_tokens': 256,
    'n_batch': 512,
    'use_mmap': True,
    'use_mlock': False,
    'use_flash': False,
    'keep_in_memory': False,
    'temperature': 0.7,
    'top_p': 0.9,
    'top_k': 40
}

llm = None  # Global model değişkeni

@app.route('/')
def home():
    system_info = get_system_info()
    models = []
    
    if os.path.exists('models'):
        for f in os.listdir('models'):
            if f.endswith('.gguf'):
                try:
                    size_gb = round(os.path.getsize(os.path.join('models', f)) / (1024**3), 2)
                    models.append({'name': f, 'size': size_gb})
                except Exception as e:
                    logger.error(f"Model boyutu hesaplanamadı: {f} - {str(e)}")
    
    return render_template('chat.html', 
                         models=models,
                         settings=DEFAULT_SETTINGS,
                         system_info=system_info)

@app.route('/load_model', methods=['POST'])
def load_model():
    global llm
    model_name = request.form.get('model_name')
    settings = {
        'n_threads': int(request.form.get('cpu_threads', DEFAULT_SETTINGS['cpu_threads'])),
        'n_ctx': int(request.form.get('n_ctx', DEFAULT_SETTINGS['n_ctx'])),
        'n_batch': int(request.form.get('n_batch', DEFAULT_SETTINGS['n_batch'])),
        'use_mmap': request.form.get('use_mmap', 'false') == 'true',
        'use_mlock': request.form.get('use_mlock', 'false') == 'true',
        'use_flash': request.form.get('use_flash', 'false') == 'true',
        'keep_in_memory': request.form.get('keep_in_memory', 'false') == 'true'
    }

    try:
        model_path = os.path.join('models', model_name)
        llm = Llama(
            model_path=model_path,
            n_ctx=settings['n_ctx'],
            n_threads=settings['n_threads'],
            n_batch=settings['n_batch'],
            use_mmap=settings['use_mmap'],
            use_mlock=settings['use_mlock'],
            flash_attn=settings['use_flash']
        )
        
        return jsonify({
            "success": True,
            "message": f"{model_name} başarıyla yüklendi",
            "model_info": {
                "name": model_name,
                "size": f"{os.path.getsize(model_path)/(1024**3):.2f} GB",
                "settings": settings
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/get_response', methods=['POST'])
def get_response():
    global llm
    if not llm:
        return jsonify({"response": "Lütfen önce bir model yükleyin!"}), 400
    
    settings = {
        'max_tokens': int(request.form.get('max_tokens', DEFAULT_SETTINGS['max_tokens'])),
        'temperature': float(request.form.get('temperature', DEFAULT_SETTINGS['temperature'])),
        'top_p': float(request.form.get('top_p', DEFAULT_SETTINGS['top_p'])),
        'top_k': int(request.form.get('top_k', DEFAULT_SETTINGS['top_k']))
    }

    try:
        response = llm.create_chat_completion(
            messages=[{"role": "user", "content": request.form['message']}],
            max_tokens=settings['max_tokens'],
            temperature=settings['temperature'],
            top_p=settings['top_p'],
            top_k=settings['top_k']
        )
        return jsonify({"response": response['choices'][0]['message']['content']})
    except Exception as e:
        return jsonify({"response": f"Hata: {str(e)}"}), 500

if __name__ == '__main__':
    os.makedirs('models', exist_ok=True)
    os.makedirs('static/css', exist_ok=True)
    os.makedirs('static/js', exist_ok=True)
    app.run(host='0.0.0.0', port=5000, debug=True)
