// Simple test of qwen2.5:7b via Ollama
import { spawn } from 'child_process';

function chat(prompt) {
  return new Promise((resolve, reject) => {
    const ollama = spawn('ollama', ['run', 'qwen2.5:7b', prompt]);
    let output = '';

    ollama.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    ollama.on('close', (code) => {
      code === 0 ? resolve(output) : reject(new Error(`Exit ${code}`));
    });
  });
}

// Test
chat('Say hello in 10 words or less').then(() => console.log('\n✓ Done'));
