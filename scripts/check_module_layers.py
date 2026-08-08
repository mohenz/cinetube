"""cinetube_api 패키지 정적 검증.

- 계층 의존 방향 위반 검사 (하위 계층이 상위 계층을 import 하지 않는지)
- import 순환 검사
- 사용하지 않는 import 검사

실행: python scripts/check_module_layers.py
"""

import ast
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent / "cinetube_api"

# 낮은 숫자가 하위 계층. 하위 계층은 상위 계층을 import 할 수 없다.
LAYERS = {
    "config": 0,
    "tables": 0,
    "database": 1,
    "http_client": 1,
    "queries": 2,
    "repository": 3,
    "media": 3,
    "importers.common": 3,
    "importers.tmdb": 3,
    "importers.movie": 3,
    "importers.actor": 3,
    "importers.webtoon": 3,
    "importers": 3,
    "jobs": 4,
    "handler": 5,
}

# 같은 계층 안에서 허용하는 예외 (조정 계층 성격)
SAME_LAYER_ALLOWED = {
    ("media", "repository"),
    ("importers.movie", "importers.tmdb"),
    ("importers.movie", "importers.common"),
    ("importers.tmdb", "importers.common"),
    ("importers.actor", "importers.common"),
    ("importers.webtoon", "importers.common"),
    ("importers", "importers.movie"),
    ("importers", "importers.actor"),
    ("importers", "importers.webtoon"),
}


def module_name(path):
    relative = path.relative_to(PACKAGE_ROOT).with_suffix("")
    parts = [part for part in relative.parts if part != "__init__"]
    return ".".join(parts)


def package_of(path, name):
    """모듈이 속한 패키지 이름. `__init__.py`는 자기 자신이 패키지다."""
    if path.name == "__init__.py":
        return name
    parts = name.split(".")
    return ".".join(parts[:-1])


def resolve_relative(package, node):
    """`from . import x` / `from ..x import y`를 패키지 내 모듈명으로 변환."""
    parts = package.split(".") if package else []
    drop = node.level - 1
    base = parts[: len(parts) - drop] if drop else parts
    if node.module:
        base = base + node.module.split(".")
    return ".".join(base)


def collect():
    graph = {}
    unused = []
    for path in sorted(PACKAGE_ROOT.rglob("*.py")):
        name = module_name(path)
        if not name:  # 패키지 루트 __init__.py
            continue
        package = package_of(path, name)
        source = path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(path))
        deps = set()
        imported = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.level:
                target = resolve_relative(package, node)
                for alias in node.names:
                    candidate = f"{target}.{alias.name}" if target else alias.name
                    deps.add(candidate if candidate in LAYERS else target)
                    imported[alias.asname or alias.name] = node.lineno
            elif isinstance(node, ast.ImportFrom) and node.module:
                for alias in node.names:
                    imported[alias.asname or alias.name.split(".")[0]] = node.lineno
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    imported[alias.asname or alias.name.split(".")[0]] = node.lineno
        graph[name] = {dep for dep in deps if dep}

        used = {
            node.id for node in ast.walk(tree) if isinstance(node, ast.Name)
        } | {
            node.attr for node in ast.walk(tree) if isinstance(node, ast.Attribute)
        }
        for node in ast.walk(tree):
            if isinstance(node, ast.Attribute):
                target = node
                while isinstance(target, ast.Attribute):
                    target = target.value
                if isinstance(target, ast.Name):
                    used.add(target.id)
        exported = set()
        for node in tree.body:
            if isinstance(node, ast.Assign) and any(
                isinstance(t, ast.Name) and t.id == "__all__" for t in node.targets
            ):
                exported = {
                    element.value for element in node.value.elts
                    if isinstance(element, ast.Constant)
                }
        for alias, lineno in imported.items():
            if alias not in used and alias not in exported:
                unused.append(f"{name}:{lineno} unused import '{alias}'")
    return graph, unused


def find_cycles(graph):
    cycles = []
    state = {}

    def visit(node, stack):
        state[node] = 1
        for dep in sorted(graph.get(node, ())):
            if dep not in graph:
                continue
            if state.get(dep) == 1:
                cycles.append(" -> ".join(stack[stack.index(dep):] + [dep]))
            elif state.get(dep, 0) == 0:
                visit(dep, stack + [dep])
        state[node] = 2

    for node in sorted(graph):
        if state.get(node, 0) == 0:
            visit(node, [node])
    return cycles


def main():
    graph, unused = collect()
    problems = []

    for module, deps in sorted(graph.items()):
        if module not in LAYERS:
            problems.append(f"계층 정의 없음: {module}")
            continue
        for dep in sorted(deps):
            if dep not in LAYERS:
                continue
            if LAYERS[dep] > LAYERS[module]:
                problems.append(f"계층 역방향 의존: {module} -> {dep}")
            elif LAYERS[dep] == LAYERS[module] and (module, dep) not in SAME_LAYER_ALLOWED:
                problems.append(f"허용되지 않은 동일 계층 의존: {module} -> {dep}")

    for cycle in find_cycles(graph):
        problems.append(f"import 순환: {cycle}")

    problems.extend(unused)

    if problems:
        print("정적 검증 실패:")
        for problem in problems:
            print(f"  - {problem}")
        return 1

    print(f"정적 검증 통과: 모듈 {len(graph)}개, 계층 위반 0, 순환 0, 미사용 import 0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
