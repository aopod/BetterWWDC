// ==UserScript==
// @name       Better WWDC
// @namespace  com.aopod
// @homepage     https://aopod.com/
// @author       aopod
// @version    0.0.1
// @description  For Better WWDC Video Watching Experience
// @include    /^https?://developer.apple.com/videos/play/(tech-talks|wwdc\d+|insights)/\d+(/.*)?$
// @updateURL    https://github.com/aopod/BetterWWDC/raw/master/better_wwdc.user.js
// @copyright  2020+, aopod
// @grant      unsafeWindow
// ==/UserScript==

(() => {
    const main = window.document.querySelector('#main');
    const video = main.querySelector('#video');
    const tabs = main.querySelectorAll('ul.tabs li.tab');
    const transcriptTab = (() => {
        for (const tab of tabs) {
            if (tab.getAttribute('data-supplement-id') == 'transcript') {
                return tab;
            }
        }
        return null;
    })();

    const checkTranscriptExist = () => {
        if (transcriptTab != null) {
            return true;
        }
        return false;
    };

    const addGlobalStyle = (css) => {
        var head, style;
        head = document.getElementsByTagName('head')[0];
        if (!head) { return; }
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    };
    addGlobalStyle(`
    a.sentence.selected { color: #0070c9 !important; }
    li.tab.speed {}
    li.tab.speed span.info { color:black;border-radius:0.8em;background-color:white;padding-top:0.2em;padding-bottom:0.2em;padding-left:1em;padding-right:1em; }
    li.tab.speed span.increase { padding-left:0.4em;padding-right:0.4em; }
    li.tab.speed span.decrease { padding-left:0.4em;padding-right:0.4em; }
    `);

    // add speed control
    (() => {
        const createSpan = (text, classString, callback) => {
            const control = window.document.createElement('a');
            const span = window.document.createElement('span');
            control.href = 'javascript:void(0)';
            span.innerHTML = text;
            span.className = classString;
            span.addEventListener('click', callback);
            return span;
        };
        const createControl = (text, classString, callback) => {
            const control = window.document.createElement('a');
            const span = createSpan(text, classString);
            control.href = 'javascript:void(0)';
            control.addEventListener('click', callback);
            control.appendChild(span);
            return control;
        };
        const updateCurrentSpeed = () => {
            let rate = video.playbackRate;
            infoControl.querySelector('span').innerHTML = `${rate}x`;
        };
        const adjustCurrentSpeed = (delta) => {
            let rate = video.playbackRate;
            rate += delta;
            if (rate < 0.5) {
                rate = 0.5;
            } else if (rate > 2) {
                rate = 2;
            }
            video.playbackRate = rate;
            updateCurrentSpeed();
        };
        const tab = window.document.createElement('li');
        tab.className = 'tab speed';
        const infoControl = createControl('1x', 'smaller info', () => {
            video.playbackRate = 1;
            updateCurrentSpeed();
        });
        const increaseControl = createControl('+', 'increase', () => {
            adjustCurrentSpeed(0.25);
            updateCurrentSpeed();
        });
        const decreaseControl = createControl('-', 'decrease', () => {
            adjustCurrentSpeed(-0.25);
        });
        tab.appendChild(infoControl);
        tab.appendChild(increaseControl);
        tab.appendChild(decreaseControl);
        const tabContainer = main.querySelector('ul.tabs');
        tabContainer.appendChild(tab);

        // Keypress
        video.addEventListener('keydown', event => {
            // ArrowLeft: 37, ArrowRight: 39
            const keyCode = event.keyCode;
            let offset = 0;
            switch (keyCode) {
                case 38: // ArrowUp
                    offset = 0.25;
                    break;
                case 40: // ArrowDown
                    offset = -0.25;
                    break
            }
            if (offset == 0) {
                return;
            }
            adjustCurrentSpeed(offset);
            updateCurrentSpeed();
        });
    })();

    if (!checkTranscriptExist()) {
        return;
    }
    
    const supplements = main.querySelector('ul.supplements');
    const transcriptSupplement = supplements.querySelector('li.supplement.transcript');
    let lastSentence = null;
    const timelines = (() => {    
        const sentences = transcriptSupplement.querySelectorAll('a.sentence');
        let timelines = [];
        let currentIndex = 0;
        for (const sentence of sentences) {
            const href = sentence.href;
            const secondsStr = href.split('?time=').pop();
            const seconds = parseInt(secondsStr);
            let theSentence = lastSentence;
            if (theSentence == null) {
                theSentence = sentence;
            }
            for (; currentIndex <= seconds; currentIndex++) {
                timelines[currentIndex] = theSentence;
            }
            lastSentence = sentence;
        }
        return timelines;
    })();
    
    let lastSelected = null;
    const updateCurrentSentence = () => {
        if (!video.currentTime) {
            return;
        }
        const time = parseInt(video.currentTime);
        let sentence = null;
        if (time < 0) {
            sentence = timelines[0];
        } else if (time >= timelines.length) {
            sentence = lastSentence;
        } else {
            sentence = timelines[time];
        }
        if (lastSelected == sentence) {
            return;
        }
        if (lastSelected != null) {
            lastSelected.classList.remove('selected');
        }
        sentence.classList.add('selected');
        lastSelected = sentence;

        // scroll
        let top = sentence.offsetTop - 80;
        transcriptSupplement.scroll({
            top: top,
            behavior: 'smooth',
        });
    };

    let timer = null;
    video.addEventListener('play', () => {
        timer = window.setInterval(() => {
            updateCurrentSentence();
        }, 300);
    });
    video.addEventListener('pause', () => {
        window.clearInterval(timer);
    });
    video.addEventListener('stop', () => {
        window.clearInterval(timer);
    });
})();
