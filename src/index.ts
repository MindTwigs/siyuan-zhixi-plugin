import { Plugin, openTab, getFrontend, getBackend, Custom, Tab } from "siyuan";

const TAB_HOME = "space";
const TAB_PAGE = "web-page";

function webview(custom: Custom, type: string): any {
  custom.element.innerHTML = `
    <div style="display: flex" class="fn__flex-column fn__flex fn__flex-1">
        <webview allowfullscreen allowpopups style="border: none" class="fn__flex-column fn__flex fn__flex-1 ${type}"></webview>
    </div>
  `;
  return custom.element.querySelector("webview." + type);
}

export default class PluginZhixi extends Plugin {
  private origin = "https://www.zhixi.com";
  private aTab?: Tab;

  onload() {
    const that = this;
    const reHome = new RegExp(`^${this.origin}(/desktop)?/space`);

    this.addIcons(`<symbol id="iconZhixi" viewBox="0 0 44 40">
      <path d="M12.9 0.09 C13.07 0.23 13.03 0.43 12.99 0.55 L12.96 0.64 C11.58 3.4 11.06 5.79 11.41 7.81 C11.91 7.8 12.42 7.76 12.95 7.69 C15.87 11.17 20.77 14.18 26.94 16.28 C28.42 13.85 29.31 10.96 29.6 7.62 L29.67 6.78 L29.7 6.56 C29.74 6.3 29.82 6.03 30.03 5.98 C30.3 5.91 30.53 6.19 30.69 6.45 L30.78 6.62 L30.82 6.69 C32.19 9.18 32.72 12.89 32.43 17.82 C33.35 18.04 34.29 18.23 35.25 18.4 C36.81 15.14 37.17 10.51 35.78 4.15 L35.63 3.5 L35.57 3.26 L35.52 3.02 C35.47 2.74 35.47 2.49 35.61 2.4 C35.86 2.22 36.47 2.64 36.88 3.12 C38.79 5.46 39.97 7.54 41.03 10.16 L41.24 10.69 C42.37 13.45 42.91 16.16 42.86 18.81 L42.84 19.3 L42.82 19.65 L42.8 20.03 L42.74 20.67 L42.7 21.13 L42.62 21.76 L42.52 22.42 L42.43 22.98 C42.41 23.08 42.39 23.18 42.38 23.27 L42.25 23.87 C41.46 27.48 39.6 32.1 35.19 35.5 C28.41 39.84 21.32 40.54 13.94 37.59 L12.58 40 C6.8 37.66 2.61 33.08 0 26.27 C-2.07 18.47 -1.32 12.05 2.26 7 L2.48 6.7 L2.75 6.35 L3.07 5.96 L3.43 5.53 L3.85 5.05 C3.92 4.97 4 4.88 4.08 4.8 C4.74 5.45 5.43 6 6.17 6.44 L6.58 5.74 L6.76 5.43 L6.97 5.1 L7.21 4.74 C8.12 3.41 9.61 1.69 12.28 0.12 L12.4 0.07 C12.55 0.01 12.76 -0.05 12.9 0.09 Z M10.43 22.01 C9.23 22.4 8.58 23.69 8.97 24.9 C9.36 26.11 10.66 26.77 11.86 26.38 C13.06 25.99 13.71 24.7 13.32 23.49 C12.93 22.28 11.63 21.62 10.43 22.01 Z"/>
    </symbol>`);

    this.addTab({
      type: TAB_PAGE,
      init() {
        const page = webview(this, TAB_PAGE);
        that.hookWindowOpen(page);
        page.addEventListener("dom-ready", () => {
          page.insertCSS(`
            .tpl-details-wrapper .header-wrap .back-btn,
            .tpl-details-wrapper .footer-wrap,
            #__next > .footer-wrap {
              display: none !important;
            }
          `);
          // page.openDevTools();
        });
        page.addEventListener("page-title-updated", (e: { title: string }) => {
          that.aTab?.updateTitle(e.title);
        });
        page.addEventListener("did-navigate-in-page", (e: { url: string }) => {
          if (reHome.test(e.url)) {
            page.stop(); // 返回文件列表
            that.openHome();
            that.aTab?.close();
          }
        });
      },
    });
    this.addTab({
      type: TAB_HOME,
      init() {
        const home = webview(this, TAB_HOME);
        home.src = that.origin + "/space?page=owner#app=siyuan";
        that.hookWindowOpen(home);
      },
    });
  }

  onLayoutReady() {
    this.addTopBar({
      icon: "iconZhixi",
      title: "知犀",
      position: "right",
      callback: () => {
        this.openHome();
      },
    });

    this.closeTabs();
    // console.log(`frontend: ${getFrontend()}; backend: ${getBackend()}`);
  }

  private hookWindowOpen(webview: any) {
    webview.addEventListener("dom-ready", () => {
      webview.executeJavaScript(`
        window.open = function (url) {
          if (url instanceof SVGAnimatedString) url = url.baseVal;
          console.debug(JSON.stringify({ type: "open", url }));
        }
        document.addEventListener('click', (e) => {
          const target = e.target || e.srcElement;
          const a = target.closest('a[target*="blank"]');
          if (a) {
            e.preventDefault();
            window.open(a.href);
          }
        })
      `);
      // webview.openDevTools();
    });
    webview.addEventListener(
      "console-message",
      (e: { level: string; message: string }) => {
        if (e.level) return;
        let message = undefined;
        try {
          message = JSON.parse(e.message);
        } catch (_e) {}
        if (message?.type === "open") this.openURL(message.url);
      },
    );
  }
  private openURL(path: string) {
    const { app, name, origin } = this;
    if (path.startsWith(origin)) {
      path = path.slice(origin.length);
    }
    if (/^https?:/.test(path)) {
      const { shell } = (window as any).require("electron");
      return shell.openExternal(path);
    }

    openTab({
      app,
      custom: {
        id: name + TAB_PAGE,
        icon: "",
        title: "知犀",
      },
    }).then((tab) => {
      const page = tab.panelElement.querySelector("webview") as any;
      page.src = origin + path;
      this.aTab = tab;
    });
  }
  private openHome() {
    openTab({
      app: this.app,
      custom: {
        id: this.name + TAB_HOME,
        icon: "",
        title: "知犀思维导图",
      },
    });
    window.siyuan.layout.leftDock.toggleModel("file", false, false, true);
  }

  private closeTabs() {
    const tabs = this.getOpenedTab();
    for (const key of Object.keys(tabs)) {
      for (const { tab } of tabs[key]) {
        // console.log("removeTab", key, tab);
        tab.close();
      }
    }
  }

  onunload() {
    console.log("unload ".concat(this.name));
    this.closeTabs();
  }
  uninstall() {
    console.log("uninstall ".concat(this.name));
  }
}
