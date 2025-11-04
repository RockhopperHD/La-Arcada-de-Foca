
import React, { useMemo, useState } from 'react';
import type { GameData } from '../types';

const generateHtmlTemplate = (gameData: GameData | null, gameScript: string | null): string => {
    const title = gameData?.title || 'Untitled Game';
    
    let translationsObject = `
        const t = {
          comf: { language: 'Language', settings: 'Settings', title: 'General Title', play: 'Play', howTo: 'How to Play', date: 'October 28, 2025', user: 'by %user%', madeWith: 'Made with AINARA' },
          target: { language: 'Idioma', settings: 'Configuración', title: 'Título General', play: 'Jugar', howTo: 'Cómo Jugar', date: '28 octubre 2025', user: 'de %user%', madeWith: 'Hecho con AINARA' }
        };
    `;

    if (gameData?.labels) {
        try {
            const keys = ['language', 'play', 'howTo', 'settings', 'date', 'user', 'madeWith'];
            const pairs = gameData.labels.split(',').map(p => p.trim().split('/'));

            if (pairs.length >= keys.length) {
                const comf: { [key: string]: string } = {};
                const target: { [key: string]: string } = {};
                keys.forEach((key, i) => {
                    comf[key] = pairs[i][0];
                    target[key] = pairs[i][1];
                });
                
                translationsObject = `const t = { comf: ${JSON.stringify(comf)}, target: ${JSON.stringify(target)} };`;
            }
        } catch (e) {
            console.error("Could not parse AI labels, using defaults.", e);
        }
    }
    
    const howToPlayHtml = gameData?.how_to_play?.map(rule => `<li>${rule}</li>`).join('') || '<li>No instructions provided.</li>';

    const baseScript = `
        const $ = s => document.querySelector(s);
        let inComfyLanguage = false;

        // DYNAMIC TRANSLATIONS OBJECT
        ${translationsObject}

        // Add title to translation object
        t.comf.title = "${gameData?.title || 'Untitled Game'}";
        t.target.title = "${gameData?.title || 'Untitled Game'}";
        
        function applyLang(lang) {
            const d = t[lang];
            if (!d) return;
            if ($('#langBtn')) $('#langBtn').textContent = d.language;
            if ($('#settingsBtn')) $('#settingsBtn').textContent = d.settings;
            if ($('#settingsTitle')) $('#settingsTitle').textContent = d.settings;
            if ($('#title')) $('#title').textContent = d.title;
            if ($('#date')) $('#date').textContent = d.date;
            if ($('#footerRight')) $('#footerRight').textContent = d.madeWith;
            if ($('#footerLeft')) $('#footerLeft').textContent = d.user;
            
            // Translate title screen buttons
            if ($('#playBtn')) $('#playBtn').textContent = d.play;
            if ($('#howToPlayBtn')) $('#howToPlayBtn').textContent = d.howTo;
            if ($('#howToPlayTitle')) $('#howToPlayTitle').textContent = d.howTo;
        }

        document.addEventListener('DOMContentLoaded', () => {
            const settingsBtn = $('#settingsBtn');
            const langBtn = $('#langBtn');
            const settingsModal = $('#settingsModal');
            const closeModalBtn = $('#closeModalBtn');
            const darkModeToggle = $('#darkModeToggle');
            const playBtn = $('#playBtn');
            const titleScreen = $('#titleScreen');
            const howToPlayBtn = $('#howToPlayBtn');
            const howToPlayModal = $('#howToPlayModal');
            const closeHowToPlayBtn = $('#closeHowToPlayBtn');

            // Settings Modal Logic
            if (settingsBtn && settingsModal) settingsBtn.onclick = () => { settingsModal.style.display = 'flex'; };
            if (closeModalBtn && settingsModal) closeModalBtn.onclick = () => { settingsModal.style.display = 'none'; };
            if (settingsModal) settingsModal.onclick = (e) => { if (e.target === settingsModal) settingsModal.style.display = 'none'; };
            
            // Dark Mode Logic
            if (darkModeToggle) {
                if (document.body.classList.contains('dark')) darkModeToggle.checked = true;
                darkModeToggle.addEventListener('change', () => document.body.classList.toggle('dark'));
            }

            // Language Toggle
            if (langBtn) {
                langBtn.onclick = () => {
                    inComfyLanguage = !inComfyLanguage;
                    applyLang(inComfyLanguage ? 'comf' : 'target');
                    window.dispatchEvent(new Event('languageToggle'));
                };
            }

            // Title Screen Logic
            if (playBtn && titleScreen) {
                playBtn.onclick = () => {
                    titleScreen.remove();
                    window.dispatchEvent(new Event('gameStart'));
                };
            }
            if (howToPlayBtn && howToPlayModal) howToPlayBtn.onclick = () => { howToPlayModal.style.display = 'flex'; };
            if (closeHowToPlayBtn && howToPlayModal) closeHowToPlayBtn.onclick = () => { howToPlayModal.style.display = 'none'; };


            // Initial Setup
            applyLang('target');

            // --- DOM Interception to contain AI-generated modals ---
            const gameContainer = document.getElementById('mainContainer');
            if (gameContainer) {
                const originalAppendChild = document.body.appendChild.bind(document.body);
                document.body.appendChild = function(node) {
                    if (node.nodeType === 1 && node.classList.contains('modal-backdrop')) {
                        // All AI modals must go inside the game area to be contained
                        const gameArea = document.getElementById('gameArea');
                        if (gameArea) return gameArea.appendChild(node);
                    }
                    return originalAppendChild(node);
                };
            }
        });
    `;

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Preview</title>
            <link href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap" rel="stylesheet">
            <style>
                :root {--font:'Ubuntu',system-ui,sans-serif;--color-bg:#FFF9C4;--color-maintext:#000;--color-primary:#1E88E5;--color-secondary:#795548;--color-success:#43A047;--color-danger:#E53935;--radius:16px;--shadow:0 10px 30px rgba(0,0,0,.12);--border:1px solid rgba(0,0,0,.12);}
                body.dark {--color-bg:#121212;--color-maintext:#FFF;--color-primary:#64B5F6;--color-secondary:#B0BEC5;background:var(--color-bg);color:var(--color-maintext);}
                body {margin:0;font-family:var(--font);background:var(--color-bg);color:var(--color-maintext);display:flex;flex-direction:column;min-height:100vh;transition:background .3s,color .3s;}
                
                header {display:flex;justify-content:space-between;align-items:center;padding:16px 24px;width:100%;box-sizing:border-box;flex-shrink:0;}
                .header-controls { display: flex; gap: 12px; }

                footer{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;width:100%;box-sizing:border-box;flex-shrink:0;}
                
                main{flex-grow:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;}
                
                .btn{border:none;border-radius:var(--radius);font-weight:600;cursor:pointer;padding: 8px 16px; font-size: 14px; transition: all 0.2s ease;}
                .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                .btn.alt{background:var(--color-secondary);color:#fff;}
                .btn.primary{background:var(--color-primary);color:#fff;padding:14px 28px;font-size:18px;}
                .btn.danger{background:var(--color-danger);color:#fff;}
                
                .container{position:relative;background:#fff;border:var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:24px 32px;width:100%;max-width:800px;text-align:center;transition:all .3s ease-in-out;min-height:600px;box-sizing:border-box;display:flex;flex-direction:column; overflow: hidden;}
                body.dark .container{background:#1E1E1E;}
                
                #gameArea{text-align:left;flex-grow:1;height:100%;}
                
                /* Standard Title Screen */
                #titleScreen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; gap: 16px; }
                #titleScreen h1 { font-size: 2.5rem; margin: 0; color: var(--color-primary); }
                #titleScreen p { font-size: 1.1rem; max-width: 80%; }
                #titleScreen .actions { display: flex; gap: 16px; margin-top: 20px; }
                
                /* Harness Modals (Settings, How to Play) */
                .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
                .modal-content { background: var(--color-bg); padding: 24px; border-radius: var(--radius); box-shadow: 0 5px 15px rgba(0,0,0,0.3); width: 90%; max-width: 400px; text-align: left; }
                body.dark .modal-content { background: #2a2a2a; }
                .modal-content h2 { margin-top: 0; }
                .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .modal-header h2 { margin: 0; }
                .modal-header button { background:none; border:none; font-size: 24px; cursor:pointer; color: var(--color-maintext); line-height: 1; }
                .setting-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; }
                #howToPlayModal ul { list-style-position: inside; padding-left: 10px; }
                #howToPlayModal li { margin-bottom: 8px; }

                input[type="checkbox"] { position: relative; width: 44px; height: 24px; -webkit-appearance: none; background: #ccc; outline: none; border-radius: 20px; box-shadow: inset 0 0 5px rgba(0,0,0,0.2); transition: .5s; cursor: pointer;}
                input:checked[type="checkbox"] { background: var(--color-primary); }
                input[type="checkbox"]:before { content: ''; position: absolute; width: 20px; height: 20px; border-radius: 20px; top: 2px; left: 2px; background: #fff; transform: scale(1.1); box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: .5s; }
                input:checked[type="checkbox"]:before { left: 22px; }

                /* Styles for AI-generated modals to ensure they are contained */
                .modal-backdrop { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(30,30,30,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; border-radius: var(--radius); }
                .modal-backdrop .modal { background: var(--color-bg); padding: 24px; border-radius: var(--radius); box-shadow: var(--shadow); width: 90%; max-width: 450px; text-align: left; border: var(--border); }
                body.dark .modal-backdrop .modal { background: #2a2a2a; }
                .modal-backdrop .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }

                /* Game-specific styles & dark mode compatibility */
                .choice{display:grid; grid-template-columns:auto 1fr; gap:10px;padding:14px; border:var(--border); border-radius:var(--radius);background:#fafafa; cursor:pointer; margin-bottom:12px;}
                body.dark .choice { background: #3a3a3a; border-color: rgba(255,255,255,.12); }
            </style>
        </head>
        <body>
            <header>
              <div id="title" style="font-weight: bold;"></div>
              <div class="header-controls">
                <button class="btn alt" id="langBtn"></button>
                <button class="btn alt" id="settingsBtn"></button>
              </div>
              <div id="date"></div>
            </header>
            <main>
                <section class="container" id="mainContainer">
                    <div id="gameArea">
                        ${gameData ? `
                        <div id="titleScreen">
                            <h1>${gameData.title}</h1>
                            <p>${gameData.description}</p>
                            <div class="actions">
                                <button id="playBtn" class="btn primary"></button>
                                <button id="howToPlayBtn" class="btn alt"></button>
                            </div>
                        </div>
                        ` : '<p>Generate a game to see the preview.</p>'}
                    </div>
                </section>
            </main>
            <footer><div id="footerLeft"></div><div id="footerRight"></div></footer>

            <!-- Harness Modals -->
            <div id="settingsModal" class="modal-overlay" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="settingsTitle"></h2>
                        <button id="closeModalBtn">&times;</button>
                    </div>
                    <div class="setting-item">
                        <label for="darkModeToggle">Dark Mode</label>
                        <input type="checkbox" id="darkModeToggle" />
                    </div>
                </div>
            </div>
            <div id="howToPlayModal" class="modal-overlay" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="howToPlayTitle"></h2>
                        <button id="closeHowToPlayBtn">&times;</button>
                    </div>
                    <ul>${howToPlayHtml}</ul>
                </div>
            </div>

            <script>${baseScript}<\/script>
            <script>${gameScript || ''}<\/script>
        </body>
        </html>
    `;
};

interface PreviewPanelProps {
    gameData: GameData | null;
    gameScript: string | null;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ gameData, gameScript }) => {
    const [resetKey, setResetKey] = useState(0);
    const srcDoc = useMemo(() => generateHtmlTemplate(gameData, gameScript), [gameData, gameScript]);

    return (
        <div className="flex flex-col bg-gray-900 rounded-lg p-4 shadow-xl h-full">
            <h2 className="text-xl font-bold mb-3 text-green-400">
                Live Preview
            </h2>
            <div className="flex-grow bg-white rounded-md overflow-hidden border-4 border-gray-700">
                <iframe
                    key={`${srcDoc}-${resetKey}`} // Force re-render on content change or reset
                    srcDoc={srcDoc}
                    title="Game Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                />
            </div>
            <button
                onClick={() => setResetKey(k => k + 1)}
                className="mt-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full"
            >
                Reset Game
            </button>
        </div>
    );
};

export default PreviewPanel;
