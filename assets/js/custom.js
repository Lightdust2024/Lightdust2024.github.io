// 切换主题时禁用毛玻璃过渡，切换后恢复（背景图层切换由 head/custom.html 处理）
(function() {
    function switchTheme(newScheme) {
        const root = document.documentElement;
        // 只给毛玻璃元素添加 .no-transition，不影响背景层
        const glassElements = document.querySelectorAll(
            '.widget:not(.archives), .sidebar-inner, .pagination, .section, .article-content'
        );
        glassElements.forEach(el => el.classList.add('no-transition'));

        root.setAttribute('data-scheme', newScheme);

        // 等待两帧后移除 .no-transition
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                glassElements.forEach(el => el.classList.remove('no-transition'));
            });
        });
    }
})();
