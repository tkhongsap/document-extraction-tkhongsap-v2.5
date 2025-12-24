"""
RAG Service
Retrieval-Augmented Generation for resume Q&A
"""
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.llm_service import LLMService, Message, get_llm_service
from app.services.resume_service import ResumeService
from app.services.embedding_service import get_embedding_service


@dataclass
class RAGResult:
    """RAG query result"""
    answer: str
    sources: List[Dict[str, Any]]
    query: str
    model: str
    usage: Dict[str, int]


class RAGService:
    """
    RAG Service for resume-based Q&A
    
    Pipeline:
    1. Query → Embedding
    2. Semantic Search → Top K resumes
    3. Build Context from resumes
    4. LLM Generation with context
    5. Return answer with sources
    """
    
    # System prompts for different use cases
    SYSTEM_PROMPTS = {
        "default": """คุณเป็น HR Assistant ที่ช่วยวิเคราะห์และค้นหาผู้สมัครงาน
คุณมีข้อมูล resume ของผู้สมัครหลายคน ให้ตอบคำถามโดยอ้างอิงจากข้อมูลที่ให้มาเท่านั้น

กฎ:
1. ตอบเป็นภาษาไทยเสมอ (ยกเว้นชื่อเฉพาะ, skills, ตำแหน่งงาน)
2. อ้างอิงชื่อผู้สมัครเมื่อกล่าวถึง
3. ถ้าไม่มีข้อมูลเพียงพอ ให้บอกตรงๆ
4. วิเคราะห์และให้เหตุผลประกอบเสมอ
5. ถ้าถูกถามหาผู้สมัคร ให้จัดอันดับและบอกเหตุผล""",

        "comparison": """คุณเป็น HR Assistant ที่ช่วยเปรียบเทียบผู้สมัครงาน
ให้วิเคราะห์และเปรียบเทียบผู้สมัครตามข้อมูลที่ให้มา

กฎ:
1. ตอบเป็นภาษาไทย
2. เปรียบเทียบแบบ point-by-point
3. ระบุจุดเด่นและจุดด้อยของแต่ละคน
4. สรุปข้อแนะนำท้ายคำตอบ""",

        "summary": """คุณเป็น HR Assistant ที่ช่วยสรุปข้อมูลผู้สมัครงาน
ให้สรุปข้อมูลอย่างกระชับและครบถ้วน

กฎ:
1. ตอบเป็นภาษาไทย
2. สรุปเป็นหัวข้อย่อย
3. เน้นข้อมูลที่สำคัญสำหรับการตัดสินใจ
4. ใส่ข้อมูลเชิงปริมาณถ้ามี (ปี, เงินเดือน, จำนวน)""",
    }
    
    def __init__(
        self,
        db: AsyncSession,
        llm_service: Optional[LLMService] = None,
        top_k: int = 5,
        similarity_threshold: float = 0.3,
    ):
        """
        Initialize RAG service
        
        Args:
            db: Database session
            llm_service: LLM service instance
            top_k: Number of resumes to retrieve
            similarity_threshold: Minimum similarity score
        """
        self.db = db
        self.llm_service = llm_service or get_llm_service()
        self.resume_service = ResumeService(db)
        self.embedding_service = get_embedding_service()
        self.top_k = top_k
        self.similarity_threshold = similarity_threshold
    
    def _format_resume_context(self, resumes: List[Dict[str, Any]]) -> str:
        """
        Format resumes into context string for LLM
        
        Args:
            resumes: List of resume dicts with similarity scores
            
        Returns:
            Formatted context string
        """
        if not resumes:
            return "ไม่พบข้อมูลผู้สมัครที่เกี่ยวข้อง"
        
        context_parts = []
        
        for i, resume in enumerate(resumes, 1):
            parts = [f"### ผู้สมัคร {i}: {resume.get('name', 'ไม่ระบุชื่อ')}"]
            
            if resume.get('similarity_score'):
                parts.append(f"- ความเกี่ยวข้อง: {resume['similarity_score']:.0%}")
            
            if resume.get('current_role'):
                parts.append(f"- ตำแหน่งปัจจุบัน: {resume['current_role']}")
            
            if resume.get('years_experience'):
                parts.append(f"- ประสบการณ์: {resume['years_experience']} ปี")
            
            if resume.get('location'):
                parts.append(f"- ที่อยู่: {resume['location']}")
            
            if resume.get('skills'):
                skills = resume['skills']
                if isinstance(skills, list):
                    skills_str = ", ".join(skills[:15])  # Limit to 15 skills
                    if len(skills) > 15:
                        skills_str += f" (+{len(skills) - 15} more)"
                    parts.append(f"- Skills: {skills_str}")
            
            if resume.get('summary'):
                summary = resume['summary'][:500]  # Limit summary length
                if len(resume.get('summary', '')) > 500:
                    summary += "..."
                parts.append(f"- สรุป: {summary}")
            
            if resume.get('email'):
                parts.append(f"- Email: {resume['email']}")
            
            if resume.get('phone'):
                parts.append(f"- โทร: {resume['phone']}")
            
            context_parts.append("\n".join(parts))
        
        return "\n\n".join(context_parts)
    
    def _build_prompt(
        self,
        query: str,
        context: str,
        prompt_type: str = "default"
    ) -> List[Message]:
        """
        Build chat messages with context
        
        Args:
            query: User query
            context: Resume context
            prompt_type: Type of system prompt to use
            
        Returns:
            List of chat messages
        """
        system_prompt = self.SYSTEM_PROMPTS.get(
            prompt_type, 
            self.SYSTEM_PROMPTS["default"]
        )
        
        user_message = f"""ข้อมูลผู้สมัคร:
{context}

---

คำถาม: {query}"""
        
        return [
            Message(role="system", content=system_prompt),
            Message(role="user", content=user_message),
        ]
    
    def _detect_prompt_type(self, query: str) -> str:
        """Detect appropriate prompt type from query"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ["เปรียบเทียบ", "compare", "vs", "กับ"]):
            return "comparison"
        elif any(word in query_lower for word in ["สรุป", "summary", "รวม"]):
            return "summary"
        else:
            return "default"
    
    async def query(
        self,
        query: str,
        user_id: Optional[str] = None,
        top_k: Optional[int] = None,
        prompt_type: Optional[str] = None,
        temperature: float = 0.7,
    ) -> RAGResult:
        """
        Execute RAG query
        
        Args:
            query: User question
            user_id: Optional user ID to filter resumes
            top_k: Override default top_k
            prompt_type: Override auto-detected prompt type
            temperature: LLM temperature
            
        Returns:
            RAGResult with answer and sources
        """
        k = top_k or self.top_k
        
        # Step 1: Semantic search for relevant resumes
        search_results = await self.resume_service.search_semantic(
            query=query,
            user_id=user_id,
            limit=k,
            threshold=self.similarity_threshold,
        )
        
        # Step 2: Format context
        context = self._format_resume_context(search_results)
        
        # Step 3: Build prompt
        detected_type = prompt_type or self._detect_prompt_type(query)
        messages = self._build_prompt(query, context, detected_type)
        
        # Step 4: Get LLM response
        response = await self.llm_service.chat(
            messages=messages,
            temperature=temperature,
        )
        
        # Step 5: Return result with sources
        sources = [
            {
                "id": r.get("id"),
                "name": r.get("name"),
                "current_role": r.get("current_role"),
                "similarity_score": r.get("similarity_score"),
            }
            for r in search_results
        ]
        
        return RAGResult(
            answer=response.content,
            sources=sources,
            query=query,
            model=response.model,
            usage=response.usage,
        )
    
    async def query_stream(
        self,
        query: str,
        user_id: Optional[str] = None,
        top_k: Optional[int] = None,
        prompt_type: Optional[str] = None,
        temperature: float = 0.7,
    ):
        """
        Execute RAG query with streaming response
        
        Yields:
            - First: sources dict
            - Then: content chunks
        """
        k = top_k or self.top_k
        
        # Step 1: Semantic search
        search_results = await self.resume_service.search_semantic(
            query=query,
            user_id=user_id,
            limit=k,
            threshold=self.similarity_threshold,
        )
        
        # Yield sources first
        sources = [
            {
                "id": r.get("id"),
                "name": r.get("name"),
                "current_role": r.get("current_role"),
                "similarity_score": r.get("similarity_score"),
            }
            for r in search_results
        ]
        yield {"type": "sources", "data": sources}
        
        # Step 2: Format context
        context = self._format_resume_context(search_results)
        
        # Step 3: Build prompt
        detected_type = prompt_type or self._detect_prompt_type(query)
        messages = self._build_prompt(query, context, detected_type)
        
        # Step 4: Stream LLM response
        async for chunk in self.llm_service.chat_stream(
            messages=messages,
            temperature=temperature,
        ):
            yield {"type": "content", "data": chunk}
        
        yield {"type": "done", "data": None}


def get_rag_service(
    db: AsyncSession,
    top_k: int = 5,
    similarity_threshold: float = 0.3,
) -> RAGService:
    """Get RAG service instance"""
    return RAGService(db=db, top_k=top_k, similarity_threshold=similarity_threshold)
