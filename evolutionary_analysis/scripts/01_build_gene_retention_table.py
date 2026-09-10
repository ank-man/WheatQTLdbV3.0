"""
Build a per-gene homoeolog-retention (fractionation) table from the Ensembl
Plants BioMart export (taestivum_eg_gene dataset, IWGSC RefSeq annotation).

Input:  evolutionary_analysis/raw_data/ensembl_plants_wheat_homoeologs.tsv
Output: evolutionary_analysis/data/gene_retention.csv

Each wheat gene is classified by how many of its expected homoeologous
copies (out of 2 possible partners on the other two subgenomes) Ensembl's
Compara pipeline could actually find:
  retained_partners = 2  -> complete 1:1:1 triad (no fractionation detected)
  retained_partners = 1  -> partially fractionated (one partner lost)
  retained_partners = 0  -> singleton (both partners lost / fully fractionated)

Coded by Ankush Sharma <mr.ank2999@gmail.com>
"""
import csv
import collections
import os

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IN_PATH = os.path.join(HERE, "raw_data", "ensembl_plants_wheat_homoeologs.tsv")
GC_PATH = os.path.join(HERE, "raw_data", "ensembl_plants_wheat_gene_gc.tsv")
OUT_PATH = os.path.join(HERE, "data", "gene_retention.csv")

MAIN_CHRS = {f"{n}{g}" for n in range(1, 8) for g in "ABD"}

gc_content = {}
with open(GC_PATH) as f:
    for row in csv.DictReader(f, delimiter="\t"):
        v = row["Gene % GC content"]
        if v:
            gc_content[row["Gene stable ID"]] = float(v)

with open(IN_PATH) as f:
    reader = csv.DictReader(f, delimiter="\t")
    rows = list(reader)

gene_chr = {}
gene_start = {}
gene_end = {}
homoeologs = collections.defaultdict(set)

for row in rows:
    g = row["Gene stable ID"]
    gene_chr[g] = row["Chromosome/scaffold name"]
    gene_start[g] = int(row["Gene start (bp)"])
    gene_end[g] = int(row["Gene end (bp)"])
    hg = row["Triticum aestivum homoeologue gene stable ID"]
    if hg:
        homoeologs[g].add(hg)

all_genes = [g for g in gene_chr if gene_chr[g] in MAIN_CHRS]

n_no_gc = sum(1 for g in all_genes if g not in gc_content)

with open(OUT_PATH, "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["gene_id", "chromosome", "genome", "start", "end", "n_homoeolog_partners", "retention_class", "gc_content"])
    for g in sorted(all_genes, key=lambda g: (gene_chr[g], gene_start[g])):
        n = min(len(homoeologs.get(g, set())), 2)
        cls = {0: "singleton", 1: "partial", 2: "triad"}[n]
        chrom = gene_chr[g]
        gc = gc_content.get(g, "")
        w.writerow([g, chrom, chrom[-1], gene_start[g], gene_end[g], n, cls, gc])

print(f"Wrote {len(all_genes)} genes -> {OUT_PATH} ({n_no_gc} genes missing GC content)")

counts = collections.Counter(min(len(homoeologs.get(g, set())), 2) for g in all_genes)
total = len(all_genes)
print("\nGenome-wide retention summary (21 main chromosomes):")
for k, label in [(2, "triad (both homoeologs retained)"), (1, "partial (one homoeolog retained)"), (0, "singleton (both homoeologs lost)")]:
    print(f"  {label}: {counts[k]:,} ({counts[k]/total*100:.1f}%)")

print("\nPer-chromosome fractionation rate (fraction of genes that are singletons):")
by_chr = collections.defaultdict(lambda: [0, 0])
for g in all_genes:
    by_chr[gene_chr[g]][1] += 1
    if min(len(homoeologs.get(g, set())), 2) == 0:
        by_chr[gene_chr[g]][0] += 1
for chrom in sorted(by_chr, key=lambda c: (int(c[:-1]), c[-1])):
    single, tot = by_chr[chrom]
    print(f"  {chrom}: {single/tot*100:5.1f}% singleton  (n={tot})")
