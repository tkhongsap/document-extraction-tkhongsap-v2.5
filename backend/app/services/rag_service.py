"""
RAG Service
Retrieval-Augmented Generation for resume Q&A
Supports both full-resume search and semantic chunk-based search
"""
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.services.llm_service import LLMService, Message, get_llm_service
from app.services.resume_service import ResumeService
from app.services.embedding_service import get_embedding_service
from app.services.chunking_service import ChunkingService


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
        use_chunks: bool = True,  # NEW: Use semantic chunks instead of full resume
    ):
        """
        Initialize RAG service
        
        Args:
            db: Database session
            llm_service: LLM service instance
            top_k: Number of resumes to retrieve
            similarity_threshold: Minimum similarity score
            use_chunks: If True, search by semantic chunks (more accurate for specific queries)
                       If False, search by full resume embedding (broader matching)
        """
        self.db = db
        self.llm_service = llm_service or get_llm_service()
        self.resume_service = ResumeService(db)
        self.chunking_service = ChunkingService(db)
        self.embedding_service = get_embedding_service()
        self.top_k = top_k
        self.similarity_threshold = similarity_threshold
        self.use_chunks = use_chunks
    
    async def _search_by_chunks(
        self,
        query: str,
        user_id: Optional[str] = None,
        limit: int = 10,
        threshold: float = 0.3,
    ) -> List[Dict[str, Any]]:
        """
        Search using semantic chunks and aggregate by resume.
        
        This method:
        1. Searches document_chunks for relevant chunks
        2. Groups chunks by extraction_id (resume)
        3. Fetches full resume data for context
        4. Returns resumes with their matching chunks
        
        Args:
            query: Search query
            user_id: Optional user filter
            limit: Max results
            threshold: Similarity threshold
            
        Returns:
            List of resumes with matching chunks and scores
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Generate query embedding
        query_embedding = await self.embedding_service.create_embedding(query)
        embedding_str = f"'[{','.join(map(str, query_embedding))}]'"
        
        # Search chunks with similarity
        # Get more chunks than needed to aggregate by resume
        chunk_limit = limit * 5
        
        if user_id:
            sql = text(f"""
                SELECT 
                    dc.id, dc.extraction_id, dc.chunk_type, dc.text, dc.metadata,
                    1 - (dc.embedding <=> {embedding_str}::vector) as similarity,
                    r.id as resume_id, r.name, r.email, r.phone, r.location,
                    r.current_role, r.years_experience, r.skills, r.summary
                FROM document_chunks dc
                LEFT JOIN resumes r ON r.extraction_id = dc.extraction_id
                WHERE dc.embedding IS NOT NULL
                AND dc.user_id = :user_id
                AND 1 - (dc.embedding <=> {embedding_str}::vector) >= :threshold
                ORDER BY dc.embedding <=> {embedding_str}::vector
                LIMIT :limit
            """).bindparams(
                user_id=user_id,
                threshold=threshold,
                limit=chunk_limit,
            )
        else:
            sql = text(f"""
                SELECT 
                    dc.id, dc.extraction_id, dc.chunk_type, dc.text, dc.metadata,
                    1 - (dc.embedding <=> {embedding_str}::vector) as similarity,
                    r.id as resume_id, r.name, r.email, r.phone, r.location,
                    r.current_role, r.years_experience, r.skills, r.summary
                FROM document_chunks dc
                LEFT JOIN resumes r ON r.extraction_id = dc.extraction_id
                WHERE dc.embedding IS NOT NULL
                AND 1 - (dc.embedding <=> {embedding_str}::vector) >= :threshold
                ORDER BY dc.embedding <=> {embedding_str}::vector
                LIMIT :limit
            """).bindparams(
                threshold=threshold,
                limit=chunk_limit,
            )
        
        result = await self.db.execute(sql)
        rows = result.fetchall()
        
        logger.info(f"[RAG Chunks] Found {len(rows)} matching chunks for query '{query[:50]}...'")
        
        # Group chunks by extraction_id (resume)
        resume_chunks: Dict[str, Dict[str, Any]] = {}
        
        for row in rows:
            ext_id = row.extraction_id
            if not ext_id:
                continue
                
            if ext_id not in resume_chunks:
                resume_chunks[ext_id] = {
                    "id": row.resume_id,
                    "extraction_id": ext_id,
                    "name": row.name or "ไม่ระบุชื่อ",
                    "email": row.email,
                    "phone": row.phone,
                    "location": row.location,
                    "current_role": row.current_role,
                    "years_experience": row.years_experience,
                    "skills": row.skills,
                    "summary": row.summary,
                    "chunks": [],
                    "max_similarity": 0.0,
                    "avg_similarity": 0.0,
                }
            
            # Add chunk info
            chunk_info = {
                "chunk_type": row.chunk_type,
                "text": row.text[:500] if row.text else "",  # Limit chunk text
                "similarity": float(row.similarity),
            }
            resume_chunks[ext_id]["chunks"].append(chunk_info)
            
            # Track max similarity for this resume
            if row.similarity > resume_chunks[ext_id]["max_similarity"]:
                resume_chunks[ext_id]["max_similarity"] = float(row.similarity)
        
        # Calculate average similarity and sort by max similarity
        results = []
        for ext_id, data in resume_chunks.items():
            if data["chunks"]:
                data["avg_similarity"] = sum(c["similarity"] for c in data["chunks"]) / len(data["chunks"])
                data["similarity_score"] = data["max_similarity"]  # Use max for ranking
                results.append(data)
        
        # Sort by max similarity and limit
        results.sort(key=lambda x: x["max_similarity"], reverse=True)
        results = results[:limit]
        
        logger.info(f"[RAG Chunks] Aggregated to {len(results)} unique resumes")
        for r in results:
            logger.info(f"  - {r['name']}: max_sim={r['max_similarity']:.4f}, chunks={len(r['chunks'])}")
        
        return results
    
    def _format_chunk_context(self, results: List[Dict[str, Any]]) -> str:
        """
        Format chunk-based search results into context string for LLM.
        Includes matching chunks to provide more relevant context.
        
        Args:
            results: List of resumes with chunks from _search_by_chunks
            
        Returns:
            Formatted context string with chunk details
        """
        if not results:
            return "ไม่พบข้อมูลผู้สมัครที่เกี่ยวข้อง"
        
        context_parts = []
        
        for i, resume in enumerate(results, 1):
            parts = [f"### ผู้สมัคร {i}: {resume.get('name', 'ไม่ระบุชื่อ')}"]
            
            if resume.get('max_similarity'):
                parts.append(f"- ความเกี่ยวข้อง: {resume['max_similarity']:.0%}")
            
            if resume.get('current_role'):
                parts.append(f"- ตำแหน่งปัจจุบัน: {resume['current_role']}")
            
            if resume.get('years_experience'):
                parts.append(f"- ประสบการณ์: {resume['years_experience']} ปี")
            
            if resume.get('location'):
                parts.append(f"- ที่อยู่: {resume['location']}")
            
            if resume.get('skills'):
                skills = resume['skills']
                if isinstance(skills, list):
                    skills_str = ", ".join(skills[:15])
                    if len(skills) > 15:
                        skills_str += f" (+{len(skills) - 15} more)"
                    parts.append(f"- Skills: {skills_str}")
            
            # Add matching chunks (most relevant context)
            chunks = resume.get('chunks', [])
            if chunks:
                parts.append(f"\n**ข้อมูลที่เกี่ยวข้อง ({len(chunks)} รายการ):**")
                # Sort chunks by similarity and show top 3
                top_chunks = sorted(chunks, key=lambda x: x['similarity'], reverse=True)[:3]
                for chunk in top_chunks:
                    chunk_type = chunk.get('chunk_type', 'unknown')
                    chunk_text = chunk.get('text', '')[:300]
                    if len(chunk.get('text', '')) > 300:
                        chunk_text += "..."
                    parts.append(f"  [{chunk_type}] {chunk_text}")
            
            if resume.get('email'):
                parts.append(f"- Email: {resume['email']}")
            
            if resume.get('phone'):
                parts.append(f"- โทร: {resume['phone']}")
            
            context_parts.append("\n".join(parts))
        
        return "\n\n".join(context_parts)
    
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
        use_chunks: Optional[bool] = None,  # Override instance setting
    ) -> RAGResult:
        """
        Execute RAG query
        
        Args:
            query: User question
            user_id: Optional user ID to filter resumes
            top_k: Override default top_k
            prompt_type: Override auto-detected prompt type
            temperature: LLM temperature
            use_chunks: Override use_chunks setting (None = use instance default)
            
        Returns:
            RAGResult with answer and sources
        """
        k = top_k or self.top_k
        should_use_chunks = use_chunks if use_chunks is not None else self.use_chunks
        
        # Step 1: Semantic search
        if should_use_chunks:
            # Use chunk-based search (more precise for specific queries)
            search_results = await self._search_by_chunks(
                query=query,
                user_id=user_id,
                limit=k,
                threshold=self.similarity_threshold,
            )
            # Format with chunk context
            context = self._format_chunk_context(search_results)
        else:
            # Use full-resume search (broader matching)
            search_results = await self.resume_service.search_semantic(
                query=query,
                user_id=user_id,
                limit=k,
                threshold=self.similarity_threshold,
            )
            context = self._format_resume_context(search_results)
        
        # Step 2: Build prompt
        detected_type = prompt_type or self._detect_prompt_type(query)
        messages = self._build_prompt(query, context, detected_type)
        
        # Step 3: Get LLM response
        response = await self.llm_service.chat(
            messages=messages,
            temperature=temperature,
        )
        
        # Step 4: Return result with sources
        sources = [
            {
                "id": r.get("id"),
                "name": r.get("name"),
                "current_role": r.get("current_role"),
                "similarity_score": r.get("similarity_score") or r.get("max_similarity"),
                "matched_chunks": len(r.get("chunks", [])) if should_use_chunks else None,
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
        use_chunks: Optional[bool] = None,  # Override instance setting
    ):
        """
        Execute RAG query with streaming response
        
        Yields:
            - First: sources dict
            - Then: content chunks
        """
        k = top_k or self.top_k
        should_use_chunks = use_chunks if use_chunks is not None else self.use_chunks
        
        # Step 1: Semantic search
        if should_use_chunks:
            # Use chunk-based search
            search_results = await self._search_by_chunks(
                query=query,
                user_id=user_id,
                limit=k,
                threshold=self.similarity_threshold,
            )
            context = self._format_chunk_context(search_results)
        else:
            # Use full-resume search
            search_results = await self.resume_service.search_semantic(
                query=query,
                user_id=user_id,
                limit=k,
                threshold=self.similarity_threshold,
            )
            context = self._format_resume_context(search_results)
        
        # Yield sources first
        sources = [
            {
                "id": r.get("id"),
                "name": r.get("name"),
                "current_role": r.get("current_role"),
                "similarity_score": r.get("similarity_score") or r.get("max_similarity"),
                "matched_chunks": len(r.get("chunks", [])) if should_use_chunks else None,
            }
            for r in search_results
        ]
        yield {"type": "sources", "sources": sources}
        
        # Step 2: Build prompt
        detected_type = prompt_type or self._detect_prompt_type(query)
        messages = self._build_prompt(query, context, detected_type)
        
        # Step 3: Stream LLM response
        async for chunk in self.llm_service.chat_stream(
            messages=messages,
            temperature=temperature,
        ):
            yield {"type": "content", "content": chunk}
        
        yield {"type": "done"}


def get_rag_service(
    db: AsyncSession,
    top_k: int = 5,
    similarity_threshold: float = 0.3,
    use_chunks: bool = True,
) -> RAGService:
    """
    Get RAG service instance
    
    Args:
        db: Database session
        top_k: Number of results to retrieve
        similarity_threshold: Minimum similarity score
        use_chunks: If True (default), use semantic chunks for more accurate search
                   If False, use full resume embeddings for broader matching
    """
    return RAGService(
        db=db,
        top_k=top_k,
        similarity_threshold=similarity_threshold,
        use_chunks=use_chunks,
    )
