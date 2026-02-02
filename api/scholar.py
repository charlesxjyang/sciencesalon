from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json

# Vercel Python serverless function
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
            from scholarly import scholarly

            papers = []
            author = scholarly.search_author_id(scholar_id)
            # Only fill author to get publications list, don't fill each pub (too slow)
            author = scholarly.fill(author, sections=['publications'])

            for pub in author.get('publications', [])[:50]:
                bib = pub.get('bib', {})

                # Get URL from pub_url or eprint_url
                url = pub.get('pub_url') or pub.get('eprint_url')

                paper = {
                    'title': bib.get('title', ''),
                    'authors': bib.get('author', '').split(' and ') if bib.get('author') else [],
                    'year': int(bib.get('pub_year')) if bib.get('pub_year') else None,
                    'citations': pub.get('num_citations', 0),
                    'doi': None,
                    'arxiv_id': None,
                    'url': url,
                }

                # Try to extract DOI or arXiv ID from URL
                if url:
                    if 'doi.org/' in url:
                        paper['doi'] = url.split('doi.org/')[-1].split('?')[0]
                    elif 'arxiv.org/abs/' in url:
                        paper['arxiv_id'] = url.split('arxiv.org/abs/')[-1].split('?')[0]

                papers.append(paper)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'papers': papers}).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def log_message(self, format, *args):
        pass  # Suppress logging
