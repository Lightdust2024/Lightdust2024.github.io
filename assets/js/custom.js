// assets/js/custom.js
// 背景图层的创建与主题切换监听已移至 layouts/partials/head/custom.html 的内联脚本，
// 以便在页面加载早期（head 解析阶段）就创建背景图层并 preload 背景图，避免闪屏。
(function() {
    // 切换主题时禁用毛玻璃过渡，切换后恢复
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

    // 如果您有主题切换按钮，建议在按钮点击时调用 switchTheme，而不依赖 observer
    // 例如：
    // document.querySelector('#theme-toggle').addEventListener('click', function() {
    //     const current = document.documentElement.getAttribute('data-scheme');
    //     const next = current === 'light' ? 'dark' : 'light';
    //     switchTheme(next);
    // });
})();
