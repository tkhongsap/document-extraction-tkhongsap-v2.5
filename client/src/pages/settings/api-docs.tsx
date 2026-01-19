import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  FileText, 
  Code, 
  Zap, 
  Key,
  Upload,
  FileJson,
  Terminal,
  BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Code examples
const CODE_EXAMPLES = {
  curl: {
    health: `curl -H "X-API-Key: dk_your_api_key" \\
  http://localhost:8000/api/v1/public/extract/health`,
    
    resume: `curl -X POST "http://localhost:8000/api/v1/public/extract/process" \\
  -H "X-API-Key: dk_your_api_key" \\
  -F "file=@resume.pdf" \\
  -F "documentType=resume"`,
    
    invoice: `curl -X POST "http://localhost:8000/api/v1/public/extract/process" \\
  -H "X-API-Key: dk_your_api_key" \\
  -F "file=@invoice.pdf" \\
  -F "documentType=invoice"`,
    
    general: `curl -X POST "http://localhost:8000/api/v1/public/extract/general" \\
  -H "X-API-Key: dk_your_api_key" \\
  -F "file=@document.pdf"`,
  },
  
  python: {
    single: `import requests

API_KEY = "dk_your_api_key"
BASE_URL = "http://localhost:8000/api/v1/public/extract"

def extract_resume(file_path: str) -> dict:
    """Extract data from a resume file"""
    with open(file_path, 'rb') as f:
        response = requests.post(
            f"{BASE_URL}/process",
            headers={"X-API-Key": API_KEY},
            files={"file": f},
            data={"documentType": "resume"}
        )
    response.raise_for_status()
    return response.json()

# Usage
result = extract_resume("resume.pdf")
print(f"Name: {result['extractedData']['name']}")
print(f"Email: {result['extractedData']['email']}")
print(f"Skills: {result['extractedData']['skills']}")`,

    batch: `import requests
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

API_KEY = "dk_your_api_key"
BASE_URL = "http://localhost:8000/api/v1/public/extract"

def extract_single_resume(file_path: Path) -> dict:
    """Extract data from a single resume"""
    try:
        with open(file_path, 'rb') as f:
            response = requests.post(
                f"{BASE_URL}/process",
                headers={"X-API-Key": API_KEY},
                files={"file": (file_path.name, f, "application/pdf")},
                data={"documentType": "resume"}
            )
        response.raise_for_status()
        return {
            "file": file_path.name,
            "success": True,
            "data": response.json()
        }
    except Exception as e:
        return {
            "file": file_path.name,
            "success": False,
            "error": str(e)
        }

def batch_extract_resumes(input_folder: str, output_file: str, max_workers: int = 3):
    """
    Batch extract resumes from a folder
    
    Args:
        input_folder: Path to folder containing resume files
        output_file: Path to output JSON file
        max_workers: Number of parallel workers (be mindful of rate limits)
    """
    input_path = Path(input_folder)
    
    # Find all PDF files
    pdf_files = list(input_path.glob("*.pdf"))
    print(f"Found {len(pdf_files)} PDF files")
    
    results = []
    
    # Process in parallel (with limited workers to avoid rate limits)
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(extract_single_resume, pdf): pdf 
            for pdf in pdf_files
        }
        
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            
            if result["success"]:
                name = result["data"].get("extractedData", {}).get("name", "Unknown")
                print(f"✅ {result['file']} - {name}")
            else:
                print(f"❌ {result['file']} - {result['error']}")
    
    # Save results to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            "total": len(results),
            "successful": sum(1 for r in results if r["success"]),
            "failed": sum(1 for r in results if not r["success"]),
            "results": results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\\nResults saved to {output_file}")
    return results

# Usage Example
if __name__ == "__main__":
    batch_extract_resumes(
        input_folder="./resumes",
        output_file="./extracted_resumes.json",
        max_workers=3
    )`,
  },
  
  javascript: {
    single: `const API_KEY = "dk_your_api_key";
const BASE_URL = "http://localhost:8000/api/v1/public/extract";

async function extractResume(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("documentType", "resume");

  const response = await fetch(\`\${BASE_URL}/process\`, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }

  return response.json();
}

// Usage with file input
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const result = await extractResume(file);
  
  console.log("Name:", result.extractedData.name);
  console.log("Email:", result.extractedData.email);
  console.log("Skills:", result.extractedData.skills);
});`,

    nodejs: `const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_KEY = "dk_your_api_key";
const BASE_URL = "http://localhost:8000/api/v1/public/extract";

async function extractResume(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('documentType', 'resume');

  const response = await fetch(\`\${BASE_URL}/process\`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      ...form.getHeaders(),
    },
    body: form,
  });

  return response.json();
}

async function batchExtract(inputFolder, outputFile) {
  const files = fs.readdirSync(inputFolder)
    .filter(f => f.endsWith('.pdf'));
  
  console.log(\`Processing \${files.length} files...\`);
  
  const results = [];
  
  for (const file of files) {
    try {
      const filePath = path.join(inputFolder, file);
      const result = await extractResume(filePath);
      results.push({ file, success: true, data: result });
      console.log(\`✅ \${file} - \${result.extractedData?.name || 'Unknown'}\`);
    } catch (error) {
      results.push({ file, success: false, error: error.message });
      console.log(\`❌ \${file} - \${error.message}\`);
    }
    
    // Rate limiting - wait 500ms between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  fs.writeFileSync(outputFile, JSON.stringify({
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  }, null, 2));
  
  console.log(\`\\nResults saved to \${outputFile}\`);
}

// Usage
batchExtract('./resumes', './extracted_resumes.json');`,
  },
};

// Sample response
const SAMPLE_RESPONSE = {
  resume: `{
  "success": true,
  "extractedData": {
    "name": "สมชาย ใจดี",
    "email": "somchai@example.com",
    "phone": "081-234-5678",
    "location": "Bangkok, Thailand",
    "current_role": "Senior Software Engineer",
    "years_experience": 5,
    "summary": "Experienced software engineer with expertise in Python, JavaScript, and cloud technologies...",
    "skills": [
      "Python",
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js",
      "PostgreSQL",
      "AWS",
      "Docker"
    ],
    "education": [
      {
        "degree": "Bachelor's Degree",
        "field": "Computer Science",
        "institution": "Chulalongkorn University",
        "year": "2018"
      }
    ],
    "experience": [
      {
        "title": "Senior Software Engineer",
        "company": "Tech Company Ltd.",
        "start_date": "2021-01",
        "end_date": "Present",
        "description": "Led development of microservices architecture..."
      },
      {
        "title": "Software Engineer",
        "company": "Startup Inc.",
        "start_date": "2018-06",
        "end_date": "2020-12",
        "description": "Full-stack development using React and Node.js..."
      }
    ],
    "certifications": [
      "AWS Solutions Architect Associate",
      "Google Cloud Professional"
    ],
    "languages": [
      { "language": "Thai", "level": "Native" },
      { "language": "English", "level": "Professional" }
    ]
  },
  "pagesProcessed": 2,
  "fileName": "resume_somchai.pdf",
  "fileSize": 245678,
  "mimeType": "application/pdf",
  "documentId": "doc_abc123",
  "extractionId": "ext_xyz789",
  "apiKeyUsage": {
    "used": 5,
    "limit": 1000,
    "remaining": 995
  }
}`,

  batch: `{
  "total": 10,
  "successful": 9,
  "failed": 1,
  "results": [
    {
      "file": "resume_somchai.pdf",
      "success": true,
      "data": {
        "success": true,
        "extractedData": {
          "name": "สมชาย ใจดี",
          "email": "somchai@example.com",
          "skills": ["Python", "JavaScript", "React"],
          "years_experience": 5
        },
        "pagesProcessed": 2,
        "apiKeyUsage": { "used": 1, "limit": 1000, "remaining": 999 }
      }
    },
    {
      "file": "resume_somying.pdf",
      "success": true,
      "data": {
        "success": true,
        "extractedData": {
          "name": "สมหญิง รักงาน",
          "email": "somying@example.com",
          "skills": ["Data Science", "Machine Learning", "Python"],
          "years_experience": 3
        },
        "pagesProcessed": 1,
        "apiKeyUsage": { "used": 2, "limit": 1000, "remaining": 998 }
      }
    },
    {
      "file": "resume_corrupt.pdf",
      "success": false,
      "error": "Unable to parse PDF file"
    }
  ]
}`,
};

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ description: "Copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="p-4 bg-zinc-950 text-zinc-100 rounded-lg overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={copyToClipboard}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="space-y-8 pb-12">
      {/* Back link */}
      <div>
        <Link href="/settings/api-keys">
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to API Keys
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <BookOpen className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">API Documentation</h1>
          <p className="text-muted-foreground">
            Learn how to use the Document AI Extractor API
          </p>
        </div>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Quick Start
          </CardTitle>
          <CardDescription>
            Get started with the API in 3 simple steps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-medium">Get API Key</h4>
                <p className="text-sm text-muted-foreground">
                  Create an API key from the{" "}
                  <Link href="/settings/api-keys" className="text-primary hover:underline">
                    API Keys page
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-medium">Add Header</h4>
                <p className="text-sm text-muted-foreground">
                  Include <code className="bg-muted px-1 rounded">X-API-Key</code> header in requests
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-medium">Upload & Extract</h4>
                <p className="text-sm text-muted-foreground">
                  Send documents via POST request to extract data
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Base URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Base URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code="http://localhost:8000/api/v1/public/extract" language="text" />
          <p className="mt-2 text-sm text-muted-foreground">
            Production URL will be provided after deployment
          </p>
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Authentication
          </CardTitle>
          <CardDescription>
            All API requests require authentication via API key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Required Header:</p>
            <code className="text-sm">X-API-Key: dk_your_api_key_here</code>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">Monthly Quota: 1,000 pages (Free Plan)</Badge>
            <Badge variant="outline">Max File Size: 50MB</Badge>
            <Badge variant="outline">Supported: PDF, PNG, JPEG, DOCX</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Template Extraction */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-600">POST</Badge>
                <code className="text-sm font-mono">/process</code>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Template-based extraction for structured documents
              </p>
              <div className="text-sm">
                <span className="font-medium">Document Types:</span>{" "}
                <code>resume</code>, <code>invoice</code>, <code>bank</code>,{" "}
                <code>po</code>, <code>contract</code>
              </div>
            </div>

            {/* General Extraction */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-600">POST</Badge>
                <code className="text-sm font-mono">/general</code>
              </div>
              <p className="text-sm text-muted-foreground">
                General document parsing - converts any document to markdown/text
              </p>
            </div>

            {/* Health Check */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-600">GET</Badge>
                <code className="text-sm font-mono">/health</code>
              </div>
              <p className="text-sm text-muted-foreground">
                Check API status and verify API key
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Code Examples
          </CardTitle>
          <CardDescription>
            Examples in different programming languages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="nodejs">Node.js</TabsTrigger>
            </TabsList>

            <TabsContent value="curl" className="space-y-4 mt-4">
              <div>
                <h4 className="font-medium mb-2">Health Check</h4>
                <CodeBlock code={CODE_EXAMPLES.curl.health} language="bash" />
              </div>
              <div>
                <h4 className="font-medium mb-2">Extract Resume</h4>
                <CodeBlock code={CODE_EXAMPLES.curl.resume} language="bash" />
              </div>
              <div>
                <h4 className="font-medium mb-2">Extract Invoice</h4>
                <CodeBlock code={CODE_EXAMPLES.curl.invoice} language="bash" />
              </div>
              <div>
                <h4 className="font-medium mb-2">General Extraction</h4>
                <CodeBlock code={CODE_EXAMPLES.curl.general} language="bash" />
              </div>
            </TabsContent>

            <TabsContent value="python" className="space-y-4 mt-4">
              <div>
                <h4 className="font-medium mb-2">Single File Extraction</h4>
                <CodeBlock code={CODE_EXAMPLES.python.single} language="python" />
              </div>
              <div>
                <h4 className="font-medium mb-2">🚀 Batch Extraction (Multiple Files)</h4>
                <CodeBlock code={CODE_EXAMPLES.python.batch} language="python" />
              </div>
            </TabsContent>

            <TabsContent value="javascript" className="space-y-4 mt-4">
              <div>
                <h4 className="font-medium mb-2">Browser (Client-side)</h4>
                <CodeBlock code={CODE_EXAMPLES.javascript.single} language="javascript" />
              </div>
            </TabsContent>

            <TabsContent value="nodejs" className="space-y-4 mt-4">
              <div>
                <h4 className="font-medium mb-2">🚀 Batch Extraction (Node.js)</h4>
                <CodeBlock code={CODE_EXAMPLES.javascript.nodejs} language="javascript" />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Response Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Response Examples
          </CardTitle>
          <CardDescription>
            Sample JSON responses from the API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single" className="w-full">
            <TabsList>
              <TabsTrigger value="single">Single Resume</TabsTrigger>
              <TabsTrigger value="batch">Batch Result</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="mt-4">
              <h4 className="font-medium mb-2">Resume Extraction Response</h4>
              <CodeBlock code={SAMPLE_RESPONSE.resume} language="json" />
            </TabsContent>

            <TabsContent value="batch" className="mt-4">
              <h4 className="font-medium mb-2">Batch Processing Result</h4>
              <CodeBlock code={SAMPLE_RESPONSE.batch} language="json" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error Codes */}
      <Card>
        <CardHeader>
          <CardTitle>Error Codes</CardTitle>
          <CardDescription>Common error responses and how to handle them</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Code</th>
                  <th className="text-left py-2 px-4">Description</th>
                  <th className="text-left py-2 px-4">Solution</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-4"><Badge variant="destructive">401</Badge></td>
                  <td className="py-2 px-4">Invalid or missing API key</td>
                  <td className="py-2 px-4 text-muted-foreground">Check your API key is correct and active</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4"><Badge variant="destructive">403</Badge></td>
                  <td className="py-2 px-4">Monthly quota exceeded</td>
                  <td className="py-2 px-4 text-muted-foreground">Upgrade plan or wait for monthly reset</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4"><Badge variant="destructive">400</Badge></td>
                  <td className="py-2 px-4">Invalid file or document type</td>
                  <td className="py-2 px-4 text-muted-foreground">Check file format and documentType parameter</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4"><Badge variant="destructive">413</Badge></td>
                  <td className="py-2 px-4">File too large</td>
                  <td className="py-2 px-4 text-muted-foreground">Reduce file size (max 50MB)</td>
                </tr>
                <tr>
                  <td className="py-2 px-4"><Badge variant="destructive">500</Badge></td>
                  <td className="py-2 px-4">Server error</td>
                  <td className="py-2 px-4 text-muted-foreground">Retry request or contact support</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limits & Quotas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg text-center">
              <div className="text-2xl font-bold text-primary">1,000</div>
              <div className="text-sm text-muted-foreground">Pages/Month (Free)</div>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="text-2xl font-bold text-primary">50 MB</div>
              <div className="text-sm text-muted-foreground">Max File Size</div>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="text-2xl font-bold text-primary">10</div>
              <div className="text-sm text-muted-foreground">Requests/Minute</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Need higher limits?{" "}
            <Link href="/pricing" className="text-primary hover:underline">
              Upgrade your plan
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Need Help */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Upload className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Ready to Extract?</h3>
              <p className="text-muted-foreground mb-4">
                Start extracting documents now using your API key.
                Check your usage and manage keys from the API Keys page.
              </p>
              <div className="flex gap-2">
                <Link href="/settings/api-keys">
                  <Button>
                    <Key className="mr-2 h-4 w-4" />
                    Manage API Keys
                  </Button>
                </Link>
                <Link href="/extraction/resume">
                  <Button variant="outline">
                    Try Web Interface
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
