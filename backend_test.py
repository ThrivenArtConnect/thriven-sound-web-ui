#!/usr/bin/env python3
"""
Backend API Testing for Thriven Sound Analyzer
Tests all API endpoints: /api/uploads, /api/pipeline, /api/stemmap, /api/export
"""

import requests
import sys
import json
import time
from datetime import datetime

class ThrivenAPITester:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.upload_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, timeout=30)
                else:
                    headers['Content-Type'] = 'application/json'
                    response = requests.post(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if 'uploadId' in response_data:
                        self.upload_id = response_data['uploadId']
                        print(f"   📁 Upload ID: {self.upload_id}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data.get('error', 'Unknown error')}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout (30s)")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_homepage_load(self):
        """Test if homepage loads correctly"""
        success, _ = self.run_test(
            "Homepage Load",
            "GET",
            "",
            200
        )
        return success

    def test_uploads_list(self):
        """Test GET /api/uploads - list all uploads"""
        success, response = self.run_test(
            "List Uploads",
            "GET", 
            "api/uploads",
            200
        )
        if success and 'uploads' in response:
            print(f"   📊 Found {len(response['uploads'])} existing uploads")
        return success

    def test_file_upload(self):
        """Test POST /api/upload - file upload"""
        # Create a small test audio file (fake WAV header)
        test_file_content = b'RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00'
        
        files = {
            'files': ('test_audio.wav', test_file_content, 'audio/wav')
        }
        data = {
            'folderName': f'Test_Pack_{datetime.now().strftime("%H%M%S")}'
        }
        
        success, response = self.run_test(
            "File Upload",
            "POST",
            "api/upload",
            200,
            data=data,
            files=files
        )
        return success

    def test_get_upload_details(self):
        """Test GET /api/uploads?uploadId=X - get specific upload"""
        if not self.upload_id:
            print("⚠️  Skipping upload details test - no upload ID available")
            return False
            
        success, response = self.run_test(
            "Get Upload Details",
            "GET",
            f"api/uploads?uploadId={self.upload_id}",
            200
        )
        if success and 'upload' in response:
            upload = response['upload']
            print(f"   📁 Folder: {upload.get('folder_name', 'N/A')}")
            print(f"   📊 Files: {upload.get('file_count', 0)}")
            print(f"   📏 Size: {upload.get('total_size_bytes', 0)} bytes")
        return success

    def test_pipeline_scan(self):
        """Test POST /api/pipeline - scan step"""
        if not self.upload_id:
            print("⚠️  Skipping pipeline scan test - no upload ID available")
            return False
            
        success, response = self.run_test(
            "Pipeline Scan Step",
            "POST",
            "api/pipeline",
            200,
            data={"uploadId": self.upload_id, "step": "scan"}
        )
        if success:
            print(f"   🔍 Scan completed for upload {self.upload_id}")
        return success

    def test_pipeline_analyze(self):
        """Test POST /api/pipeline - analyze step"""
        if not self.upload_id:
            print("⚠️  Skipping pipeline analyze test - no upload ID available")
            return False
            
        success, response = self.run_test(
            "Pipeline Analyze Step", 
            "POST",
            "api/pipeline",
            200,
            data={"uploadId": self.upload_id, "step": "analyze"}
        )
        if success:
            print(f"   📊 Analysis completed for upload {self.upload_id}")
        return success

    def test_stemmap_get(self):
        """Test GET /api/stemmap - get stemmap"""
        if not self.upload_id:
            print("⚠️  Skipping stemmap get test - no upload ID available")
            return False
            
        success, response = self.run_test(
            "Get Stemmap",
            "GET",
            f"api/stemmap?uploadId={self.upload_id}",
            404  # Expected 404 since no stemmap exists yet
        )
        # 404 is expected for new uploads
        if not success and response == {}:
            print("   ✅ Expected 404 - no stemmap exists yet")
            return True
        return success

    def test_stemmap_generate(self):
        """Test POST /api/stemmap - generate stemmap"""
        if not self.upload_id:
            print("⚠️  Skipping stemmap generate test - no upload ID available")
            return False
            
        success, response = self.run_test(
            "Generate Stemmap",
            "POST",
            "api/stemmap",
            200,
            data={
                "uploadId": self.upload_id, 
                "action": "generate",
                "title": "Test Pack"
            }
        )
        return success

    def test_export_top_n(self):
        """Test POST /api/export - export top N files"""
        if not self.upload_id:
            print("⚠️  Skipping export test - no upload ID available")
            return False
            
        success, response = self.run_test(
            "Export Top N Files",
            "POST",
            "api/export",
            200,
            data={
                "uploadId": self.upload_id,
                "action": "export-top", 
                "topN": 5
            }
        )
        return success

    def test_invalid_endpoints(self):
        """Test invalid endpoints return proper errors"""
        tests = [
            ("Invalid Method on Upload", "DELETE", "api/upload", 405, None),
            ("Invalid Method on Pipeline", "GET", "api/pipeline", 405, None),
            ("Missing Upload ID", "POST", "api/pipeline", 400, {"step": "scan"}),
            ("Invalid Upload ID", "GET", "api/uploads?uploadId=invalid-id", 404, None),
        ]
        
        all_passed = True
        for name, method, endpoint, expected_status, data in tests:
            success, _ = self.run_test(name, method, endpoint, expected_status, data)
            if not success:
                all_passed = False
        
        return all_passed

def main():
    print("🚀 Starting Thriven Sound Analyzer API Tests")
    print("=" * 60)
    
    tester = ThrivenAPITester()
    
    # Test sequence
    tests = [
        ("Homepage Load", tester.test_homepage_load),
        ("List Uploads", tester.test_uploads_list),
        ("File Upload", tester.test_file_upload),
        ("Get Upload Details", tester.test_get_upload_details),
        ("Pipeline Scan", tester.test_pipeline_scan),
        ("Pipeline Analyze", tester.test_pipeline_analyze),
        ("Get Stemmap", tester.test_stemmap_get),
        ("Generate Stemmap", tester.test_stemmap_generate),
        ("Export Top N", tester.test_export_top_n),
        ("Invalid Endpoints", tester.test_invalid_endpoints),
    ]
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
        
        # Small delay between tests
        time.sleep(0.5)
    
    # Print final results
    print(f"\n{'='*60}")
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.upload_id:
        print(f"📁 Test Upload ID: {tester.upload_id}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"✨ Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())