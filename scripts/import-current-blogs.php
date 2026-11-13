<?php

declare(strict_types=1);

const SOURCE_ORIGIN = 'https://www.hygienelinks.com';
const BLOG_OUTPUT = __DIR__ . '/../data/imported-blogs.json';
const IMAGE_OUTPUT_DIR = __DIR__ . '/../public/imported-blogs';

libxml_use_internal_errors(true);

function fetchUrl(string $url): string
{
    $lastError = '';
    for ($attempt = 1; $attempt <= 4; $attempt++) {
        $handle = curl_init($url);
        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 5,
            CURLOPT_CONNECTTIMEOUT => 20,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_USERAGENT => 'HygieneLinksContentMigration/1.0 (+https://www.hygienelinks.com)',
            CURLOPT_HTTPHEADER => ['Accept: text/html,application/xhtml+xml,image/avif,image/webp,image/*,*/*;q=0.8'],
            CURLOPT_ENCODING => '',
        ]);
        $body = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $lastError = curl_error($handle);
        if (is_string($body) && $body !== '' && $status >= 200 && $status < 300) {
            return $body;
        }
        usleep($attempt * 350000);
    }
    throw new RuntimeException("Unable to fetch {$url}: {$lastError}");
}

function absoluteSourceUrl(string $value, string $pageUrl = SOURCE_ORIGIN): string
{
    $value = trim(html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    if ($value === '') {
        return '';
    }
    if (preg_match('~^https?://~i', $value)) {
        return preg_replace('~^http://~i', 'https://', $value) ?? $value;
    }
    if (str_starts_with($value, '//')) {
        return 'https:' . $value;
    }
    if (str_starts_with($value, '/')) {
        return SOURCE_ORIGIN . $value;
    }
    $base = rtrim(dirname(parse_url($pageUrl, PHP_URL_PATH) ?: '/'), '/');
    return SOURCE_ORIGIN . ($base === '' ? '' : $base) . '/' . ltrim($value, '/');
}

function loadDocument(string $html): DOMDocument
{
    $document = new DOMDocument('1.0', 'UTF-8');
    $document->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_NONET);
    return $document;
}

function classContains(string $className): string
{
    return sprintf('contains(concat(" ", normalize-space(@class), " "), " %s ")', $className);
}

function normalizedText(?DOMNode $node): string
{
    if (!$node) {
        return '';
    }
    return trim((string) preg_replace('/\s+/u', ' ', $node->textContent));
}

function metaContent(DOMXPath $xpath, string $name): string
{
    $query = sprintf('//meta[translate(@name, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")="%s"]/@content', strtolower($name));
    return normalizedText($xpath->query($query)->item(0));
}

function safeImageExtension(string $mime, string $url): string
{
    $map = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        'image/avif' => 'avif',
        'image/svg+xml' => 'svg',
    ];
    if (isset($map[$mime])) {
        return $map[$mime];
    }
    $pathExtension = strtolower(pathinfo((string) parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));
    return in_array($pathExtension, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'], true)
        ? ($pathExtension === 'jpeg' ? 'jpg' : $pathExtension)
        : 'jpg';
}

function localizeImage(string $sourceUrl, array &$mediaMap): string
{
    $sourceUrl = absoluteSourceUrl($sourceUrl);
    if ($sourceUrl === '') {
        return '';
    }
    if (isset($mediaMap[$sourceUrl])) {
        return $mediaMap[$sourceUrl];
    }
    $hashPrefix = substr(hash('sha256', $sourceUrl), 0, 20);
    $existingFiles = glob(IMAGE_OUTPUT_DIR . '/' . $hashPrefix . '.*') ?: [];
    if ($existingFiles !== []) {
        $publicPath = '/imported-blogs/' . basename($existingFiles[0]);
        $mediaMap[$sourceUrl] = $publicPath;
        return $publicPath;
    }
    $bytes = fetchUrl($sourceUrl);
    $fileInfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $fileInfo->buffer($bytes);
    if (!str_starts_with($mime, 'image/')) {
        throw new RuntimeException("Downloaded blog asset is not an image: {$sourceUrl} ({$mime})");
    }
    $extension = safeImageExtension($mime, $sourceUrl);
    $filename = $hashPrefix . '.' . $extension;
    $absolutePath = IMAGE_OUTPUT_DIR . '/' . $filename;
    if (!is_dir(IMAGE_OUTPUT_DIR) && !mkdir(IMAGE_OUTPUT_DIR, 0775, true) && !is_dir(IMAGE_OUTPUT_DIR)) {
        throw new RuntimeException('Unable to create imported blog image directory.');
    }
    if (file_put_contents($absolutePath, $bytes) === false) {
        throw new RuntimeException("Unable to save {$absolutePath}");
    }
    $publicPath = '/imported-blogs/' . $filename;
    $mediaMap[$sourceUrl] = $publicPath;
    return $publicPath;
}

function isSafeHref(string $href): bool
{
    if ($href === '' || str_starts_with($href, '#') || str_starts_with($href, '/')) {
        return true;
    }
    return (bool) preg_match('~^(https?://|mailto:|tel:)~i', $href);
}

function sanitizeCopyNode(
    DOMNode $source,
    DOMDocument $target,
    string $articleTitle,
    string $pageUrl,
    array &$mediaMap,
): DOMNode {
    if ($source->nodeType === XML_TEXT_NODE) {
        return $target->createTextNode($source->nodeValue ?? '');
    }
    if ($source->nodeType !== XML_ELEMENT_NODE) {
        return $target->createDocumentFragment();
    }

    $tag = strtolower($source->nodeName);
    $blocked = ['script', 'style', 'form', 'iframe', 'object', 'embed', 'noscript', 'template'];
    if (in_array($tag, $blocked, true)) {
        return $target->createDocumentFragment();
    }
    $allowed = [
        'p', 'h2', 'h3', 'h4', 'h5', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i',
        'blockquote', 'a', 'br', 'img', 'figure', 'figcaption', 'table', 'thead',
        'tbody', 'tr', 'th', 'td', 'div', 'span', 'hr',
    ];
    if (!in_array($tag, $allowed, true)) {
        $fragment = $target->createDocumentFragment();
        foreach ($source->childNodes as $child) {
            $cleanChild = sanitizeCopyNode($child, $target, $articleTitle, $pageUrl, $mediaMap);
            if (!$cleanChild instanceof DOMDocumentFragment || $cleanChild->hasChildNodes()) {
                $fragment->appendChild($cleanChild);
            }
        }
        return $fragment;
    }

    $element = $target->createElement($tag);
    if ($tag === 'a' && $source instanceof DOMElement) {
        $href = trim($source->getAttribute('href'));
        if (isSafeHref($href)) {
            $element->setAttribute('href', $href);
            if (preg_match('~^https?://~i', $href)) {
                $element->setAttribute('rel', 'noopener noreferrer');
            }
        }
    }
    if ($tag === 'img' && $source instanceof DOMElement) {
        $remote = absoluteSourceUrl($source->getAttribute('src'), $pageUrl);
        if ($remote !== '') {
            $element->setAttribute('src', localizeImage($remote, $mediaMap));
            $element->setAttribute('alt', normalizedText($source) ?: $articleTitle);
            $element->setAttribute('loading', 'lazy');
        }
    }
    if (in_array($tag, ['th', 'td'], true) && $source instanceof DOMElement) {
        foreach (['colspan', 'rowspan'] as $attribute) {
            $value = $source->getAttribute($attribute);
            if (preg_match('/^[1-9][0-9]?$/', $value)) {
                $element->setAttribute($attribute, $value);
            }
        }
    }
    foreach ($source->childNodes as $child) {
        $cleanChild = sanitizeCopyNode($child, $target, $articleTitle, $pageUrl, $mediaMap);
        if (!$cleanChild instanceof DOMDocumentFragment || $cleanChild->hasChildNodes()) {
            $element->appendChild($cleanChild);
        }
    }
    return $element;
}

function articleBodyHtml(
    DOMElement $container,
    string $title,
    string $pageUrl,
    array &$mediaMap,
): string {
    $target = new DOMDocument('1.0', 'UTF-8');
    $wrapper = $target->createElement('div');
    $target->appendChild($wrapper);
    $skippedTitle = false;
    foreach ($container->childNodes as $child) {
        if ($child->nodeType !== XML_ELEMENT_NODE) {
            continue;
        }
        $tag = strtolower($child->nodeName);
        $class = $child instanceof DOMElement ? $child->getAttribute('class') : '';
        if ($tag === 'a' && preg_match('/(^|\s)blog-img(\s|$)/', $class)) {
            continue;
        }
        if (!$skippedTitle && $tag === 'h3' && normalizedText($child) === $title) {
            $skippedTitle = true;
            continue;
        }
        if (preg_match('/(^|\s)post-meta-blog(\s|$)/', $class)) {
            continue;
        }
        $cleanChild = sanitizeCopyNode($child, $target, $title, $pageUrl, $mediaMap);
        if (!$cleanChild instanceof DOMDocumentFragment || $cleanChild->hasChildNodes()) {
            $wrapper->appendChild($cleanChild);
        }
    }
    $html = '';
    foreach ($wrapper->childNodes as $child) {
        $html .= $target->saveHTML($child);
    }
    return trim($html);
}

function firstParagraph(string $bodyHtml): string
{
    $document = loadDocument($bodyHtml);
    $xpath = new DOMXPath($document);
    $value = normalizedText($xpath->query('//p[normalize-space()]')->item(0));
    if ($value === '') {
        $value = normalizedText($xpath->query('//body')->item(0));
    }
    return mb_strlen($value) > 280 ? rtrim(mb_substr($value, 0, 277)) . '…' : $value;
}

function parseArticle(string $url, array &$mediaMap): array
{
    $html = fetchUrl($url);
    $document = loadDocument($html);
    $xpath = new DOMXPath($document);
    $container = $xpath->query(
        '//' . 'div[' . classContains('col-md-9') . ' and ' . classContains('col1') . ']//' .
        'div[' . classContains('blog-content') . ']'
    )->item(0);
    if (!$container instanceof DOMElement) {
        throw new RuntimeException("Article body was not found: {$url}");
    }

    $titleNode = $xpath->query('.//h3[normalize-space()][1]', $container)->item(0);
    $title = normalizedText($titleNode);
    if ($title === '') {
        throw new RuntimeException("Article title was not found: {$url}");
    }
    $metaNode = $xpath->query('.//div[' . classContains('post-meta-blog') . '][1]', $container)->item(0);
    $metaLine = normalizedText($metaNode);
    $publishedAt = null;
    $author = 'Hygiene Links';
    if (preg_match('/Created\s+Date\s*:\s*(\d{4}-\d{2}-\d{2})\s+By\s+(.+)$/iu', $metaLine, $matches)) {
        if ($matches[1] !== '0000-00-00') {
            $publishedAt = $matches[1] . ' 00:00:00';
        }
        $author = trim($matches[2]) ?: $author;
    }
    $imageNode = $xpath->query('.//a[' . classContains('blog-img') . ']//img[1]', $container)->item(0);
    $sourceImageUrl = $imageNode instanceof DOMElement
        ? absoluteSourceUrl($imageNode->getAttribute('src'), $url)
        : '';
    $imageUrl = $sourceImageUrl !== '' ? localizeImage($sourceImageUrl, $mediaMap) : '';
    $bodyHtml = articleBodyHtml($container, $title, $url, $mediaMap);
    if ($bodyHtml === '') {
        throw new RuntimeException("Article content was empty: {$url}");
    }

    $path = (string) parse_url($url, PHP_URL_PATH);
    $slug = preg_replace('/\.html$/i', '', basename($path)) ?? basename($path);
    $sourceTitle = normalizedText($xpath->query('//title')->item(0));
    $sourceDescription = metaContent($xpath, 'description');
    $sourceKeywords = metaContent($xpath, 'keywords');
    $excerpt = $sourceDescription !== '' ? $sourceDescription : firstParagraph($bodyHtml);

    return [
        'id' => 'blog-' . substr(hash('sha256', $path), 0, 24),
        'slug' => $slug,
        'legacySlug' => $slug,
        'title' => $title,
        'excerpt' => $excerpt,
        'bodyHtml' => $bodyHtml,
        'category' => 'Cleaning & Hygiene',
        'author' => $author,
        'imageUrl' => $imageUrl,
        'imageAlt' => $title,
        'status' => 'published',
        'featured' => false,
        'publishedAt' => $publishedAt,
        'sourceUrl' => $url,
        'sourceImageUrl' => $sourceImageUrl,
        'metaTitle' => $sourceTitle !== '' ? $sourceTitle : $title,
        'metaDescription' => $sourceDescription !== '' ? $sourceDescription : $excerpt,
        'keywords' => $sourceKeywords,
        'ogTitle' => $title,
        'ogDescription' => $excerpt,
        'robotsIndex' => true,
        'canonicalPath' => '/blog/details/' . $slug . '.html',
        'bodyHash' => hash('sha256', preg_replace('/\s+/u', ' ', strip_tags($bodyHtml)) ?? strip_tags($bodyHtml)),
    ];
}

function run(): void
{
    $listingUrls = [SOURCE_ORIGIN . '/blog.html'];
    for ($offset = 4; $offset <= 108; $offset += 4) {
        $listingUrls[] = SOURCE_ORIGIN . '/blog/' . $offset;
    }

    $articleUrls = [];
    foreach ($listingUrls as $index => $listingUrl) {
        fwrite(STDERR, sprintf("Discovering listing %d/%d: %s\n", $index + 1, count($listingUrls), $listingUrl));
        $document = loadDocument(fetchUrl($listingUrl));
        $xpath = new DOMXPath($document);
        foreach ($xpath->query('//a[contains(@href, "/blog/details/")]/@href') as $hrefNode) {
            $absolute = absoluteSourceUrl($hrefNode->nodeValue ?? '', $listingUrl);
            $path = (string) parse_url($absolute, PHP_URL_PATH);
            if (preg_match('~^/blog/details/[a-z0-9-]+\.html$~i', $path)) {
                $articleUrls[$absolute] = true;
            }
        }
    }
    $urls = array_keys($articleUrls);
    sort($urls, SORT_STRING);
    if (count($urls) < 100) {
        throw new RuntimeException('The crawl discovered too few articles; refusing to write an incomplete import.');
    }

    $mediaMap = [];
    $posts = [];
    $errors = [];
    foreach ($urls as $index => $url) {
        fwrite(STDERR, sprintf("Importing article %d/%d: %s\n", $index + 1, count($urls), $url));
        try {
            $posts[] = parseArticle($url, $mediaMap);
        } catch (Throwable $error) {
            $errors[] = ['url' => $url, 'error' => $error->getMessage()];
        }
    }
    if ($errors !== []) {
        fwrite(STDERR, json_encode($errors, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
        throw new RuntimeException('One or more live articles could not be imported; refusing a partial output.');
    }

    usort($posts, static function (array $left, array $right): int {
        $leftDate = $left['publishedAt'] ?? '0000-00-00 00:00:00';
        $rightDate = $right['publishedAt'] ?? '0000-00-00 00:00:00';
        return $rightDate <=> $leftDate ?: ($left['slug'] <=> $right['slug']);
    });
    foreach ($posts as $index => &$post) {
        $post['featured'] = $index === 0;
        $post['sortOrder'] = ($index + 1) * 10;
    }
    unset($post);

    $bodyHashGroups = [];
    foreach ($posts as $post) {
        $bodyHashGroups[$post['bodyHash']][] = $post['slug'];
    }
    $exactDuplicateBodies = array_values(array_filter($bodyHashGroups, static fn(array $slugs): bool => count($slugs) > 1));

    $payload = [
        'version' => 'hygienelinks-blogs-' . gmdate('Y-m-d') . '-v1',
        'source' => SOURCE_ORIGIN . '/blog.html',
        'stats' => [
            'listingPages' => count($listingUrls),
            'articlePages' => count($posts),
            'images' => count($mediaMap),
            'exactDuplicateBodies' => count($exactDuplicateBodies),
        ],
        'listingUrls' => $listingUrls,
        'exactDuplicateBodies' => $exactDuplicateBodies,
        'posts' => $posts,
    ];
    $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    if (!is_string($json) || file_put_contents(BLOG_OUTPUT, $json . "\n") === false) {
        throw new RuntimeException('Unable to write imported blog JSON.');
    }
    fwrite(STDOUT, sprintf("Imported %d articles and %d unique images into %s\n", count($posts), count($mediaMap), BLOG_OUTPUT));
}

run();
