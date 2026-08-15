// assets/js/custom.js
(function() {
    const lightBg = '/img/background1.png';
    const darkBg = '/img/background2.png';

    const bgContainer = document.createElement('div');
    bgContainer.style.position = 'fixed';
    bgContainer.style.top = '0';
    bgContainer.style.left = '0';
    bgContainer.style.width = '100%';
    bgContainer.style.height = '100%';
    bgContainer.style.zIndex = '-999';
    bgContainer.style.pointerEvents = 'none';
    // 加速整个容器
    bgContainer.style.willChange = 'opacity';
    bgContainer.style.transform = 'translateZ(0)';

    const lightLayer = document.createElement('div');
    Object.assign(lightLayer.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundImage: `url(${lightBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        opacity: '1',
        willChange: 'opacity',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
    });

    const darkLayer = document.createElement('div');
    Object.assign(darkLayer.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundImage: `url(${darkBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        opacity: '0',
        willChange: 'opacity',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
    });

    bgContainer.appendChild(lightLayer);
    bgContainer.appendChild(darkLayer);
    document.body.prepend(bgContainer);

    function updateBackground(scheme) {
        requestAnimationFrame(() => {
            if (scheme === 'dark') {
                lightLayer.style.opacity = '0';
                darkLayer.style.opacity = '1';
            } else {
                lightLayer.style.opacity = '1';
                darkLayer.style.opacity = '0';
            }
        });
    }

    // 新增：切换主题时禁用毛玻璃过渡，切换后恢复
    function switchTheme(newScheme) {
        const root = document.documentElement;
        // 只给毛玻璃元素添加 .no-transition，不影响背景层
        const glassElements = document.querySelectorAll(
            '.widget:not(.archives), .sidebar-inner, .pagination, .section, .article-content'
        );
        glassElements.forEach(el => el.classList.add('no-transition'));

        // 更改主题属性
        root.setAttribute('data-scheme', newScheme);

        // 等待两帧后移除 .no-transition
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                glassElements.forEach(el => el.classList.remove('no-transition'));
            });
        });
    }

    // 监听 data-scheme 变化
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-scheme') {
                const newScheme = document.documentElement.getAttribute('data-scheme');
                updateBackground(newScheme);   // 背景过渡正常
                // 如果希望在此处调用 switchTheme，需注意避免循环触发
                // 但这里我们直接在 observer 中调用 switchTheme 会再次触发 mutation，需要防抖
                // 更稳妥：在切换主题的地方（例如点击按钮）直接调用 switchTheme
            }
        });
    });
    observer.observe(document.documentElement, { attributes: true });

    // 如果您有主题切换按钮，建议在按钮点击时调用 switchTheme，而不依赖 observer
    // 例如：
    // document.querySelector('#theme-toggle').addEventListener('click', function() {
    //     const current = document.documentElement.getAttribute('data-scheme');
    //     const next = current === 'light' ? 'dark' : 'light';
    //     switchTheme(next);
    // });
})();
