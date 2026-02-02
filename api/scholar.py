from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, quote
import json
import re

# Vercel Python serverless function - direct HTML scraping (faster than scholarly)
class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        scholar_id = params.get('user', [None])[0]

        if not scholar_id:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Missing user parameter'}).encode())
            return

        try:
            import urllib.request

            papers = []
            # Fetch Google Scholar page directly (pagesize=100)
            url = f'https://scholar.google.com/citations?user={scholar_id}&cstart=0&pagesize=100&hl=en'

            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            })

            with urllib.request.urlopen(req, timeout=30) as response:
                html = response.read().decode('utf-8')

            # Parse papers from HTML using regex (faster than BeautifulSoup)
            # Each paper is in a <tr class="gsc_a_tr">
            paper_pattern = r'<tr class="gsc_a_tr">(.*?)</tr>'
            title_pattern = r'<a[^>]*class="gsc_a_at"[^>]*>(.*?)</a>'
            link_pattern = r'<a[^>]*class="gsc_a_at"[^>]*href="([^"]*)"'
            authors_pattern = r'<div class="gs_gray">(.*?)</div>'
            year_pattern = r'<span class="gsc_a_h gsc_a_hc gs_ibl">(\d{4})</span>'
            citations_pattern = r'<a[^>]*class="gsc_a_ac[^"]*"[^>]*>(\d+)</a>'

            for match in re.finditer(paper_pattern, html, re.DOTALL):
                row = match.group(1)

                # Extract title
                title_match = re.search(title_pattern, row, re.DOTALL)
                title = title_match.group(1).strip() if title_match else ''
                title = re.sub(r'<[^>]+>', '', title)  # Remove any HTML tags

                if not title:
                    continue

                # Extract link
                link_match = re.search(link_pattern, row)
                paper_url = None
                if link_match:
                    href = link_match.group(1)
                    if href.startswith('/'):
                        paper_url = 'https://scholar.google.com' + href

                # Extract authors (first gs_gray div)
                authors_matches = re.findall(authors_pattern, row, re.DOTALL)
                authors = []
                if authors_matches:
                    author_text = re.sub(r'<[^>]+>', '', authors_matches[0])
                    authors = [a.strip() for a in author_text.split(',') if a.strip()]

                # Extract year
                year_match = re.search(year_pattern, row)
                year = int(year_match.group(1)) if year_match else None

                # Extract citations
                citations_match = re.search(citations_pattern, row)
                citations = int(citations_match.group(1)) if citations_match else 0

                paper = {
                    'title': title,
                    'authors': authors[:10],  # Limit authors
                    'year': year,
                    'citations': citations,
                    'doi': None,
                    'arxiv_id': None,
                    'url': paper_url,
                }

                papers.append(paper)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'papers': papers, 'count': len(papers)}).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def log_message(self, format, *args):
        pass  # Suppress logging
