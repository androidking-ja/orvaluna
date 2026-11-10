import UIKit
import WebKit
import QuickLook

/// Contenedor nativo de la app web de Orvaluna (carpeta `www` incluida en el bundle).
final class WebViewController: UIViewController {

    static let night = UIColor(red: 20.0 / 255.0, green: 10.0 / 255.0, blue: 8.0 / 255.0, alpha: 1.0)

    private var webView: WKWebView!
    private var previewURL: URL?

    private lazy var language: String = {
        let code = Locale.preferredLanguages.first.map { String($0.prefix(2)).lowercased() } ?? "es"
        return ["es", "en", "de", "pt"].contains(code) ? code : "es"
    }()

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = .default()

        let controller = WKUserContentController()
        let bridge = """
        window.OrvalunaNative = {
          isNative: function () { return true; },
          getLanguage: function () { return '\(language)'; },
          savePdf: function (b64, name, share) {
            window.webkit.messageHandlers.orv.postMessage({ type: 'pdf', data: b64, name: name, share: !!share });
          }
        };
        """
        controller.addUserScript(WKUserScript(source: bridge, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        controller.add(WeakMessageHandler(self), name: "orv")
        config.userContentController = controller

        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = WebViewController.night
        web.scrollView.backgroundColor = WebViewController.night
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.bounces = false
        web.scrollView.showsVerticalScrollIndicator = false
        web.allowsBackForwardNavigationGestures = false
        web.navigationDelegate = self
        web.uiDelegate = self
        webView = web
        view = web
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        if let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") {
            webView.loadFileURL(index, allowingReadAccessTo: index.deletingLastPathComponent())
        }
        let nc = NotificationCenter.default
        nc.addObserver(self, selector: #selector(appDidEnterBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)
        nc.addObserver(self, selector: #selector(appWillEnterForeground), name: UIApplication.willEnterForegroundNotification, object: nil)
    }

    @objc private func appDidEnterBackground() {
        webView.evaluateJavaScript("window.__appPause && window.__appPause()", completionHandler: nil)
    }

    @objc private func appWillEnterForeground() {
        webView.evaluateJavaScript("window.__appResume && window.__appResume()", completionHandler: nil)
    }

    // MARK: - PDF

    fileprivate func handlePdf(_ body: [String: Any]) {
        guard let b64 = body["data"] as? String,
              let name = body["name"] as? String,
              let data = Data(base64Encoded: b64, options: .ignoreUnknownCharacters) else {
            notifyPdf(false)
            return
        }
        let share = (body["share"] as? Bool) ?? false
        let safeName = name.replacingOccurrences(of: "/", with: "_")
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let url = docs.appendingPathComponent(safeName)
        do {
            try data.write(to: url, options: .atomic)
        } catch {
            notifyPdf(false)
            return
        }
        notifyPdf(true)
        if share {
            let activity = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            if let pop = activity.popoverPresentationController {
                pop.sourceView = view
                pop.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            }
            present(activity, animated: true)
        } else {
            previewURL = url
            let preview = QLPreviewController()
            preview.dataSource = self
            present(preview, animated: true)
        }
    }

    private func notifyPdf(_ ok: Bool) {
        webView.evaluateJavaScript("window.__pdfSaved && window.__pdfSaved(\(ok ? "true" : "false"))", completionHandler: nil)
    }

    // MARK: - Textos de diálogos

    private var okTitle: String { "OK" }
    private var cancelTitle: String {
        switch language {
        case "en": return "Cancel"
        case "de": return "Abbrechen"
        case "pt": return "Cancelar"
        default: return "Cancelar"
        }
    }
}

// MARK: - Puente JS → nativo

extension WebViewController: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "orv", let body = message.body as? [String: Any] else { return }
        if (body["type"] as? String) == "pdf" {
            handlePdf(body)
        }
    }
}

/// Evita el ciclo de retención entre WKUserContentController y el controlador.
private final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(userContentController, didReceive: message)
    }
}

// MARK: - Navegación

extension WebViewController: WKNavigationDelegate {
    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = navigationAction.request.url,
           let scheme = url.scheme?.lowercased(),
           scheme == "http" || scheme == "https" || scheme == "mailto" {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }
}

// MARK: - alert() / confirm()

extension WebViewController: WKUIDelegate {
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: okTitle, style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: cancelTitle, style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: okTitle, style: .destructive) { _ in completionHandler(true) })
        present(alert, animated: true)
    }
}

// MARK: - Vista previa del PDF

extension WebViewController: QLPreviewControllerDataSource {
    func numberOfPreviewItems(in controller: QLPreviewController) -> Int { previewURL == nil ? 0 : 1 }
    func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
        return (previewURL ?? URL(fileURLWithPath: "/")) as NSURL
    }
}
