#!/usr/bin/env python3
"""
Google Scholar scraper using scholarly package.
Fetches papers for a given user ID and returns DOIs/links.

Usage:
    python scholar_scraper.py <scholar_user_id>

    # Or as a simple HTTP server:
    python scholar_scraper.py --serve --port 8080

Requirements:
    pip install scholarly
"""

import sys
import json
import argparse
from typing import Optional
from scholarly import scholarly


def get_author_papers(scholar_id: str, max_papers: int = 100) -> list[dict]:
    """
    Fetch papers for a Google Scholar author.

    Args:
        scholar_id: Google Scholar user ID (e.g., 'BYOREdwAAAAJ')
        max_papers: Maximum number of papers to fetch

    Returns:
        List of paper dicts with title, year, doi, url, citations, authors
    """
    papers = []

    try:
        # Search for author by ID
        author = scholarly.search_author_id(scholar_id)

        # Fill in author details including publications
        author = scholarly.fill(author, sections=['publications'])

        publications = author.get('publications', [])[:max_papers]

        for pub in publications:
            # Fill publication details to get DOI and other info
            try:
                filled_pub = scholarly.fill(pub)
            except Exception as e:
                print(f"Warning: Could not fill publication details: {e}", file=sys.stderr)
                filled_pub = pub

            bib = filled_pub.get('bib', {})

            paper = {
                'title': bib.get('title', ''),
                'authors': bib.get('author', '').split(' and ') if bib.get('author') else [],
                'year': bib.get('pub_year'),
                'venue': bib.get('venue', '') or bib.get('journal', '') or bib.get('conference', ''),
                'citations': filled_pub.get('num_citations', 0),
                'doi': None,
                'url': filled_pub.get('pub_url') or filled_pub.get('eprint_url'),
                'scholar_url': f"https://scholar.google.com/citations?view_op=view_citation&hl=en&user={scholar_id}&citation_for_view={filled_pub.get('author_pub_id', '')}"
            }

            # Try to extract DOI from various fields
            if 'doi' in bib:
                paper['doi'] = bib['doi']
            elif filled_pub.get('pub_url', '').startswith('https://doi.org/'):
                paper['doi'] = filled_pub['pub_url'].replace('https://doi.org/', '')

            papers.append(paper)

    except Exception as e:
        print(f"Error fetching author {scholar_id}: {e}", file=sys.stderr)
        raise

    return papers


def run_server(port: int = 8080):
    """Run a simple HTTP server for the scraper."""
    from http.server import HTTPServer, BaseHTTPRequestHandler
    from urllib.parse import urlparse, parse_qs

    class ScholarHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urlparse(self.path)

            if parsed.path == '/health':
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok'}).encode())
                return

            if parsed.path == '/papers':
                params = parse_qs(parsed.query)
                scholar_id = params.get('user', [None])[0]

                if not scholar_id:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Missing user parameter'}).encode())
                    return

                try:
                    papers = get_author_papers(scholar_id)
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
                return

            self.send_response(404)
            self.end_headers()

        def log_message(self, format, *args):
            print(f"[{self.log_date_time_string()}] {args[0]}")

    server = HTTPServer(('0.0.0.0', port), ScholarHandler)
    print(f"Scholar scraper server running on port {port}")
    print(f"  GET /papers?user=<scholar_id> - Fetch papers for a user")
    print(f"  GET /health - Health check")
    server.serve_forever()


def main():
    parser = argparse.ArgumentParser(description='Google Scholar paper scraper')
    parser.add_argument('scholar_id', nargs='?', help='Google Scholar user ID')
    parser.add_argument('--serve', action='store_true', help='Run as HTTP server')
    parser.add_argument('--port', type=int, default=8080, help='Server port (default: 8080)')
    parser.add_argument('--max', type=int, default=100, help='Max papers to fetch')

    args = parser.parse_args()

    if args.serve:
        run_server(args.port)
    elif args.scholar_id:
        papers = get_author_papers(args.scholar_id, args.max)
        print(json.dumps(papers, indent=2))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
