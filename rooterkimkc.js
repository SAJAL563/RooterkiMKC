// ==UserScript==
// @name         Rooter Stream Player That Actually Works
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  A stream player that doesn't make you want to punch your monitor
// @author       NexSUSxSajal
// @match        *://*.rooter.gg/stream/*
// @grant        none
// @require      https://cdn.plyr.io/3.7.8/plyr.js
// ==/UserScript==

(function() {
    'use strict';


    const plyrCSS = document.createElement('link');
    plyrCSS.rel = 'stylesheet';
    plyrCSS.href = 'https://cdn.plyr.io/3.7.8/plyr.css';
    document.head.appendChild(plyrCSS);

    const customCSS = document.createElement('style');
    customCSS.textContent = `
        .stream-container {
            width: 100vw !important;
            height: 100vh !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            z-index: 9999 !important;
            background: black;
        }
        .plyr {
            width: 100% !important;
            height: 100% !important;
        }
        .plyr--video {
            height: 100% !important;
        }
        .quality-selector {
            position: absolute;
            bottom: 60px;
            right: 10px;
            background: rgba(28, 28, 28, 0.9);
            border-radius: 4px;
            padding: 8px;
            display: none;
            z-index: 10;
        }
        .quality-option {
            color: white;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 14px;
            white-space: nowrap;
        }
        .quality-option:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        .quality-button {
            background: transparent;
            border: none;
            color: white;
            cursor: pointer;
            padding: 8px;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .quality-button:hover {
            opacity: 0.8;
        }
    `;
    document.head.appendChild(customCSS);


    const hlsScript = document.createElement('script');
    hlsScript.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    document.head.appendChild(hlsScript);

    setTimeout(() => {
        let contentUrl = null;
        const pageContent = document.body.innerHTML;

        const m3u8Pattern = /(https:\/\/c2ee45b2888d.eu-west-1.playback.live-video.net[^"]+\.m3u8(?:\?token=[^"]*)?)/;
        const match = pageContent.match(m3u8Pattern);

        if (match && match[0]) {
            contentUrl = match[0];
        } else {
            try {
                const jsonContent = JSON.parse(pageContent.match(/<script type="application\/ld\+json">(.+)<\/script>/)[1]);
                if (jsonContent && jsonContent.contentUrl) {
                    contentUrl = jsonContent.contentUrl;
                }
            } catch (e) {
                console.log('Failed to find stream URL:', e);
            }

        }

        if (contentUrl) {

            document.body.innerHTML = `
                <div class="stream-container">
                    <video id="player" playsinline controls>
                        <source src="${contentUrl}" type="application/x-mpegURL">
                    </video>
                    <div class="quality-selector" id="qualitySelector"></div>
                </div>
            `;


            const player = new Plyr('#player', {
                controls: [
                    'play-large',
                    'play',
                    'progress',
                    'current-time',
                    'mute',
                    'volume',
                    'settings',
                    'fullscreen'
                ],
                settings: ['quality'],
                quality: {
                    default: 1080,
                    options: [1080, 720, 480, 360]
                }
            });


            if (Hls.isSupported()) {
                const hls = new Hls({
                    maxLoadingDelay: 4,
                    maxBufferLength: 30,
                    liveDurationInfinity: true,
                    levelLoadingTimeOut: 10000,
                });

                hls.loadSource(contentUrl);
                hls.attachMedia(player.media);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    const qualities = hls.levels.map((level, index) => ({
                        label: `${level.height}p`,
                        value: index
                    }));


                    qualities.sort((a, b) => {
                        const heightA = hls.levels[a.value].height;
                        const heightB = hls.levels[b.value].height;
                        return heightB - heightA;
                    });


                    qualities.unshift({ label: 'Auto', value: -1 });


                    const qualitySelector = document.getElementById('qualitySelector');
                    qualitySelector.innerHTML = qualities.map(quality => `
                        <div class="quality-option" data-quality="${quality.value}">
                            ${quality.label}
                        </div>
                    `).join('');


                    qualitySelector.querySelectorAll('.quality-option').forEach(option => {
                        option.addEventListener('click', () => {
                            const quality = parseInt(option.dataset.quality);
                            if (quality === -1) {
                                hls.currentLevel = -1; // Auto
                            } else {
                                hls.currentLevel = quality;
                            }
                            qualitySelector.style.display = 'none';
                        });
                    });


                    const controlBar = player.elements.controls;
                    const qualityButton = document.createElement('button');
                    qualityButton.className = 'quality-button';
                    qualityButton.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20v-6M6 20V10M18 20V4"/>
                        </svg>
                        Quality
                    `;
                    controlBar.appendChild(qualityButton);

                    qualityButton.addEventListener('click', () => {
                        qualitySelector.style.display = qualitySelector.style.display === 'none' ? 'block' : 'none';
                    });


                    document.addEventListener('click', (e) => {
                        if (!qualitySelector.contains(e.target) && !qualityButton.contains(e.target)) {
                            qualitySelector.style.display = 'none';
                        }
                    });
                });
            }


            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    player.destroy();
                    window.location.reload();
                }
            });
        } else {
            alert('No stream found. Did you try turning it off and on again?');
        }
    }, 1000);
})();
