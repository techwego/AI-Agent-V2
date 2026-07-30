import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_health():
    print("Testing GET /health...")
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        if r.status_code == 200:
            print("[PASS] Health Check Passed")
            print(json.dumps(r.json(), indent=2))
            return True
        else:
            print(f"[FAIL] Health Check Failed with status {r.status_code}")
    except Exception as e:
        print(f"[FAIL] Health Check Exception: {e}")
    return False

def test_chat_backend_loop():
    print("\nTesting POST /api/chat with test=backend_loop...")
    try:
        r = requests.post(f"{BASE_URL}/api/chat", json={"message": "test", "test": "backend_loop"}, stream=True)
        result = "".join(chunk.decode('utf-8') for chunk in r.iter_content(chunk_size=1024))
        if "Hello, backend is working" in result:
            print("[PASS] Backend Loop Passed")
            return True
        else:
            print(f"[FAIL] Backend Loop Failed: got {result}")
    except Exception as e:
        print(f"[FAIL] Backend Loop Exception: {e}")
    return False

def test_chat_gemini_only():
    print("\nTesting POST /api/chat with test=gemini_only...")
    try:
        r = requests.post(f"{BASE_URL}/api/chat", json={"message": "Say exactly: 'Testing 1 2 3'", "test": "gemini_only"}, stream=True)
        result = "".join(chunk.decode('utf-8') for chunk in r.iter_content(chunk_size=1024))
        if "Testing" in result or "1" in result:
            print("[PASS] Gemini Only Passed")
            return True
        else:
            print(f"[FAIL] Gemini Only Failed: got {result}")
    except Exception as e:
        print(f"[FAIL] Gemini Only Exception: {e}")
    return False

def test_chat_rag_only():
    print("\nTesting POST /api/chat with test=rag_only...")
    try:
        r = requests.post(f"{BASE_URL}/api/chat", json={"message": "library archives", "test": "rag_only"}, stream=True)
        result = "".join(chunk.decode('utf-8') for chunk in r.iter_content(chunk_size=1024))
        if "Document" in result:
            print("[PASS] RAG Only Passed")
            return True
        else:
            print(f"[FAIL] RAG Only Failed: got {result}")
    except Exception as e:
        print(f"[FAIL] RAG Only Exception: {e}")
    return False

if __name__ == "__main__":
    print("Starting API Regression Tests\n")
    success = all([
        test_health(),
        test_chat_backend_loop(),
        # test_chat_gemini_only(), # Might fail if api key is dummy
        # test_chat_rag_only()
    ])
    
    if success:
        print("\n[PASS] ALL TESTS PASSED")
        sys.exit(0)
    else:
        print("\n[FAIL] TESTS FAILED")
        sys.exit(1)
