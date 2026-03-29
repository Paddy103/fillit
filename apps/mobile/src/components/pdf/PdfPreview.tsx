/**
 * PDF preview component using WebView.
 *
 * Renders a PDF from bytes or a file URI with built-in zoom,
 * page navigation, and scroll. Uses an embedded WebView with
 * the browser's native PDF renderer for performance.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../theme';

// ─── Types ─────────────────────────────────────────────────────────

export interface PdfPreviewProps {
  /** PDF file as a Uint8Array. Either this or `uri` must be provided. */
  pdfBytes?: Uint8Array;
  /** URI to a local or remote PDF file. Either this or `pdfBytes` must be provided. */
  uri?: string;
  /** Called when the PDF finishes loading. */
  onLoad?: () => void;
  /** Called when the PDF fails to load. */
  onError?: (error: string) => void;
  /** Whether to show the page navigation controls. @default true */
  showControls?: boolean;
  /** Component height. @default '100%' */
  height?: number | `${number}%`;
}

// ─── Helpers ──────────────────────────────────────────────────────

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Build an HTML page that renders a PDF using pdf.js for reliable
 * cross-platform rendering. Falls back to an embedded object tag.
 */
function buildPdfHtml(base64Data: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=4.0, user-scalable=yes">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: auto; background: #f5f5f5; }
    .container {
      width: 100%;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px;
    }
    canvas {
      max-width: 100%;
      margin-bottom: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      background: white;
    }
    .error { color: #c00; padding: 20px; text-align: center; font-family: sans-serif; }
    .loading { color: #666; padding: 20px; text-align: center; font-family: sans-serif; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.min.mjs" type="module"></script>
</head>
<body>
  <div class="container" id="container">
    <div class="loading" id="loading">Loading PDF...</div>
  </div>
  <script type="module">
    import { GlobalWorkerOptions, getDocument } from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.min.mjs';
    GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs';

    async function renderPdf() {
      try {
        const base64 = '${base64Data}';
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const pdf = await getDocument({ data: bytes }).promise;
        const container = document.getElementById('container');
        document.getElementById('loading').remove();

        const totalPages = pdf.numPages;
        const scale = window.devicePixelRatio || 2;

        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          container.appendChild(canvas);

          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
        }

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'loaded',
          pageCount: totalPages,
        }));
      } catch (err) {
        document.getElementById('loading').textContent = 'Failed to load PDF';
        document.getElementById('loading').className = 'error';
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: err.message || 'Unknown error',
        }));
      }
    }

    renderPdf();
  </script>
</body>
</html>`;
}

// ─── Component ─────────────────────────────────────────────────────

export function PdfPreview({
  pdfBytes,
  uri,
  onLoad,
  onError,
  showControls = true,
  height = '100%',
}: PdfPreviewProps) {
  const { theme } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const htmlContent = useMemo(() => {
    if (pdfBytes) {
      const base64 = bytesToBase64(pdfBytes);
      return buildPdfHtml(base64);
    }
    return null;
  }, [pdfBytes]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'loaded') {
          setPageCount(data.pageCount);
          setIsLoading(false);
          onLoad?.();
        } else if (data.type === 'error') {
          setError(data.message);
          setIsLoading(false);
          onError?.(data.message);
        }
      } catch {
        // Ignore non-JSON messages
      }
    },
    [onLoad, onError],
  );

  const handleWebViewError = useCallback(() => {
    const msg = 'Failed to load PDF viewer';
    setError(msg);
    setIsLoading(false);
    onError?.(msg);
  }, [onError]);

  if (!pdfBytes && !uri) {
    return (
      <View style={[styles.center, { height }]} testID="pdf-preview-empty">
        <Ionicons name="document-outline" size={48} color={theme.colors.onSurfaceVariant} />
        <Text
          style={[
            theme.typography.bodyMedium,
            { color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.sm },
          ]}
        >
          No PDF to preview
        </Text>
      </View>
    );
  }

  const source = htmlContent ? { html: htmlContent } : { uri: uri! };

  return (
    <View style={[styles.container, { height }]} testID="pdf-preview">
      <WebView
        ref={webViewRef}
        source={source}
        style={styles.webview}
        onMessage={handleMessage}
        onError={handleWebViewError}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        originWhitelist={['*']}
        allowFileAccess
        mixedContentMode="compatibility"
        testID="pdf-preview-webview"
      />

      {/* Controls overlay */}
      {showControls && !isLoading && !error && pageCount ? (
        <View
          style={[
            styles.controls,
            {
              backgroundColor: theme.colors.surface,
              borderTopWidth: 1,
              borderTopColor: theme.colors.outline,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.sm,
            },
          ]}
        >
          <Pressable
            onPress={() => webViewRef.current?.injectJavaScript('window.scrollTo(0, 0); true;')}
            accessibilityRole="button"
            accessibilityLabel="Scroll to top"
            testID="pdf-scroll-top"
          >
            <Ionicons name="arrow-up-circle-outline" size={24} color={theme.colors.primary} />
          </Pressable>
          <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>
            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
          </Text>
          <Pressable
            onPress={() =>
              webViewRef.current?.injectJavaScript(
                'window.scrollTo(0, document.body.scrollHeight); true;',
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Scroll to bottom"
            testID="pdf-scroll-bottom"
          >
            <Ionicons name="arrow-down-circle-outline" size={24} color={theme.colors.primary} />
          </Pressable>
        </View>
      ) : null}

      {/* Error state */}
      {error ? (
        <View style={[styles.overlay, styles.center]}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
          <Text
            style={[
              theme.typography.bodyMedium,
              { color: theme.colors.error, marginTop: theme.spacing.sm, textAlign: 'center' },
            ]}
          >
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});

PdfPreview.displayName = 'PdfPreview';
