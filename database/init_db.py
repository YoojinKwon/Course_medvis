"""
MedVis Database Initialization Script
SQLite 데이터베이스를 생성하고 스키마를 초기화합니다.
"""

import sqlite3
import os
from pathlib import Path

# 데이터베이스 파일 경로
DB_DIR = Path(__file__).parent
DB_PATH = DB_DIR / "medvis.db"

# 스키마 파일 경로
SCHEMA_PATH = DB_DIR / "schema.sql"


def init_database():
    """데이터베이스 초기화"""
    try:
        # 데이터베이스 연결
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        
        print(f"📦 데이터베이스 생성 중: {DB_PATH}")
        
        # schema.sql 읽기 및 실행
        if not SCHEMA_PATH.exists():
            print(f"❌ 오류: schema.sql 파일을 찾을 수 없습니다: {SCHEMA_PATH}")
            return False
        
        with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
            schema = f.read()
        
        # 스키마 실행
        cursor.executescript(schema)
        conn.commit()
        
        print("✅ 데이터베이스 스키마 생성 완료")
        
        # 테이블 확인
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
        tables = cursor.fetchall()
        print(f"📋 생성된 테이블 ({len(tables)}개):")
        for table in tables:
            print(f"   - {table[0]}")
        
        conn.close()
        print(f"✅ 데이터베이스 초기화 완료: {DB_PATH}")
        return True
        
    except sqlite3.Error as e:
        print(f"❌ 데이터베이스 오류: {e}")
        return False
    except Exception as e:
        print(f"❌ 오류: {e}")
        return False


def verify_database():
    """데이터베이스 검증"""
    try:
        if not DB_PATH.exists():
            print(f"❌ 데이터베이스 파일이 없습니다: {DB_PATH}")
            return False
        
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        
        # 테이블 개수 확인
        cursor.execute(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table'"
        )
        table_count = cursor.fetchone()[0]
        
        print(f"✅ 데이터베이스 확인 완료")
        print(f"   - 위치: {DB_PATH}")
        print(f"   - 크기: {os.path.getsize(DB_PATH)} bytes")
        print(f"   - 테이블 개수: {table_count}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 검증 오류: {e}")
        return False


def drop_database():
    """데이터베이스 삭제 (개발/테스트용)"""
    if DB_PATH.exists():
        os.remove(DB_PATH)
        print(f"🗑️  데이터베이스 삭제됨: {DB_PATH}")
    else:
        print(f"❌ 삭제할 데이터베이스가 없습니다: {DB_PATH}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "drop":
            drop_database()
        elif command == "verify":
            verify_database()
        elif command == "init":
            if init_database():
                verify_database()
        else:
            print("사용법:")
            print("  python init_db.py init       - 데이터베이스 초기화")
            print("  python init_db.py verify     - 데이터베이스 검증")
            print("  python init_db.py drop       - 데이터베이스 삭제 (⚠️ 주의!)")
    else:
        # 기본: 초기화
        if init_database():
            verify_database()
