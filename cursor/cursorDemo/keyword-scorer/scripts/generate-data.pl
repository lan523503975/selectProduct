#!/usr/bin/env perl
use strict;
use warnings;
use utf8;
use JSON::PP;
use Encode qw(decode);

sub read_shared {
  my ($path) = @_;
  open my $fh, "-|", "unzip", "-p", $path, "xl/sharedStrings.xml" or die $!;
  local $/; my $xml = <$fh>; close $fh;
  my @s;
  while ($xml =~ /<si>(.*?)<\/si>/gs) {
    my $si = $1; my $t = "";
    while ($si =~ /<t[^>]*>([^<]*)<\/t>/g) { $t .= decode("UTF-8", $1); }
    push @s, $t;
  }
  return @s;
}

sub col_to_idx {
  my ($col) = @_;
  my $n = 0;
  $n = $n * 26 + (ord($_) - 64) for split //, $col;
  return $n - 1;
}

sub parse_cell {
  my ($cxml, $shared) = @_;
  my ($t) = ($cxml =~ / t="([^"]*)"/);
  if ($cxml =~ /<is>.*?<t[^>]*>([^<]*)<\/t>/s) {
    my @ts;
    while ($cxml =~ /<t[^>]*>([^<]*)<\/t>/g) { push @ts, decode("UTF-8", $1); }
    return join "", @ts;
  }
  my ($v) = ($cxml =~ /<v>([^<]*)<\/v>/);
  return undef unless defined $v;
  return $shared->[$v] if defined $t && $t eq "s" && $v =~ /^\d+$/;
  return $v;
}

sub parse_sheet {
  my ($path, $sheet, $shared) = @_;
  open my $fh, "-|", "unzip", "-p", $path, $sheet or die $!;
  local $/; my $xml = <$fh>; close $fh;
  my @rows;
  while ($xml =~ /<row[^>]* r="(\d+)"[^>]*>(.*?)<\/row>/gs) {
    my ($rn, $rowxml) = ($1, $2);
    my %cells;
    while ($rowxml =~ /(<c r="([A-Z]+)(\d+)"[^>]*>.*?<\/c>)/gs) {
      my ($cxml, $col) = ($1, $2);
      $cells{ col_to_idx($col) } = parse_cell($cxml, $shared);
    }
    my $max = (sort { $b <=> $a } keys %cells)[0] // -1;
    push @rows, [ map { defined $cells{$_} ? $cells{$_} : "" } 0 .. $max ];
  }
  return @rows;
}

sub idx { my ($h, $name) = @_; for my $i (0 .. $#$h) { return $i if ($h->[$i] // "") eq $name } -1 }
sub num { my ($v) = @_; return 0 unless defined $v && $v =~ /^-?\d+(?:\.\d+)?$/; $v + 0 }
sub median { my @a = @_; return 0 unless @a; my $m = int(@a / 2); @a % 2 ? $a[$m] + 0 : ($a[$m - 1] + $a[$m]) / 2 }
sub dec { my ($v) = @_; $v =~ s/^\$//; num($v) }

my $base = $ARGV[0] // "..";
my $km_path = "$base/KeywordMining-US-catholic-prayer-cards-Last-30-days-113680(1).xlsx";
my $sr_path = "$base/Search(catholic-prayer-cards)-59-US-20260704.xlsx";

my @km_rows = parse_sheet($km_path, "xl/worksheets/sheet1.xml", [ read_shared($km_path) ]);
my @kh = @{ $km_rows[0] }; my @kd = @{ $km_rows[1] };
sub kv { my ($name) = @_; my $i = idx(\@kh, $name); $i >= 0 ? ($kd[$i] // "") : "" }

my $keyword = kv("关键词");
my $kw = {
  keyword           => $keyword,
  translation       => kv("关键词翻译"),
  relevance         => num(kv("相关度")),
  abaMonth          => num(kv("ABA月排名")),
  abaWeek           => num(kv("ABA周排名")),
  monthlySearch     => num(kv("月搜索量")),
  monthlyPurchase   => num(kv("月购买量")),
  purchaseRate      => num(kv("购买率")),
  supplyDemandRatio => num(kv("需供比")),
  productCount      => num(kv("商品数")),
  spr               => num(kv("SPR")),
  ppc               => dec(kv("PPC竞价")),
  avgPrice          => dec(kv("均价")),
  clickShareTop3    => num(kv("#1 点击共享")) + num(kv("#2 点击共享")) + num(kv("#3 点击共享")),
  convShareTop3     => num(kv("#1转化共享")) + num(kv("#2 转化共享")) + num(kv("#3 转化共享")),
};

my @sr_rows = parse_sheet($sr_path, "xl/worksheets/sheet1.xml", [ read_shared($sr_path) ]);
my @sh = @{ $sr_rows[0] };
my @products;
for my $r (@sr_rows[ 1 .. $#sr_rows ]) {
  push @products, {
    rank        => num($r->[ idx(\@sh, "#") ]),
    asin        => $r->[ idx(\@sh, "ASIN") ] // "",
    brand       => $r->[ idx(\@sh, "品牌") ] // "",
    title       => $r->[ idx(\@sh, "商品标题") ] // "",
    sales       => num($r->[ idx(\@sh, "月销量") ]),
    revenue     => num($r->[ idx(\@sh, '月销售额($)') ]),
    price       => num($r->[ idx(\@sh, '价格($)') ]),
    reviews     => num($r->[ idx(\@sh, "评分数") ]),
    rating      => num($r->[ idx(\@sh, "评分") ]),
    margin      => num($r->[ idx(\@sh, "毛利率") ]),
    salesGrowth => num($r->[ idx(\@sh, "月销量增长率") ]),
    daysListed  => num($r->[ idx(\@sh, "上架天数") ]),
  };
}
@products = sort { ($a->{rank} || 999) <=> ($b->{rank} || 999) } @products;

my ($total_sales, $total_rev) = (0, 0);
$total_sales += $_->{sales} for @products;
$total_rev   += $_->{revenue} for @products;
my @top10 = @products[ 0 .. 9 ];
my ($top10_sales, $top10_rev) = (0, 0);
$top10_sales += $_->{sales} for @top10;
$top10_rev   += $_->{revenue} for @top10;

my @prices    = sort { $a <=> $b } map { $_->{price} } grep { $_->{price} > 0 } @products;
my @reviews_all = sort { $a <=> $b } map { $_->{reviews} } @products;
my @reviews_nz  = sort { $a <=> $b } map { $_->{reviews} } grep { $_->{reviews} > 0 } @products;
my @margins   = sort { $a <=> $b } map { $_->{margin} } grep { $_->{margin} > 0 } @products;
my @growths   = map { $_->{salesGrowth} } @products;

sub score_demand { my ($s) = @_; return 20 if $s > 10000; return 15 if $s >= 5000; return 10 if $s >= 1000; return 5 }
sub score_supply { my ($r) = @_; return 20 if $r > 1.0; return 15 if $r >= 0.3; return 10 if $r >= 0.1; return 5 }
sub score_concentration { my ($pct) = @_; return 20 if $pct < 30; return 15 if $pct <= 50; return 10 if $pct <= 70; return 5 }
sub score_price { my ($p) = @_; return 15 if $p > 20; return 12 if $p >= 12; return 8 if $p >= 8; return 5 }
sub score_diff {
  my ($titles) = @_;
  my $text = join " ", @$titles;
  my $seg = 0;
  $seg++ if $text =~ /women|men|kids|child|teen/i;
  $seg++ if $text =~ /bulk|assorted|gift|bookmark/i;
  $seg++ if $text =~ /saint|rosary|bible|verse/i;
  $seg++ if $text =~ /laminated|illustrated|metal box/i;
  return 15 if $seg >= 3; return 12 if $seg >= 2; return 8 if $seg >= 1; return 5;
}
sub score_trend {
  my ($aba_m, $aba_w, $growths) = @_;
  my $aba_up = ($aba_w > $aba_m) ? 0 : 1;
  my $pos = 0; for (@$growths) { $pos++ if $_ > 0 }
  my $ratio = @$growths ? $pos / scalar(@$growths) : 0;
  return 10 if $aba_up && $ratio >= 0.5;
  return 7 if $ratio >= 0.35 || !$aba_up;
  return 3;
}
sub score_review_barrier { my ($med) = @_; return 20 if $med <= 50; return 15 if $med <= 200; return 10 if $med <= 500; return 5 }

my $top10_pct = $total_sales ? 100 * $top10_sales / $total_sales : 0;
my $med_price = median(@prices);
my $med_reviews = median(@reviews_all);
my $med_reviews_nz = @reviews_nz ? median(@reviews_nz) : 0;
my $med_margin = @margins ? median(@margins) : 0;

my $s1 = score_demand($kw->{monthlySearch});
my $s2 = score_supply($kw->{supplyDemandRatio});
my $s3 = score_concentration($top10_pct);
my $s4 = score_price($med_price);
my $s5 = score_diff([ map { $_->{title} } @products ]);
my $s6 = score_trend($kw->{abaMonth}, $kw->{abaWeek}, \@growths);
my $s7 = score_review_barrier($med_reviews_nz);
my $total = $s1 + $s2 + $s3 + $s4 + $s5 + $s6;

sub verdict {
  my ($t) = @_;
  return { label => "强烈建议做", prob => "75%-85%", color => "#22c55e", level => "high" } if $t >= 80;
  return { label => "可以做", prob => "55%-70%", color => "#3b82f6", level => "medium" } if $t >= 60;
  return { label => "谨慎", prob => "30%-50%", color => "#f59e0b", level => "low" } if $t >= 40;
  return { label => "不建议做", prob => "<30%", color => "#ef4444", level => "reject" };
}

my @risks;
push @risks, "中位客单价 \$" . sprintf("%.2f", $med_price) . " 偏低，利润空间有限" if $med_price < 12;
push @risks, "Top3 点击共享 " . sprintf("%.1f%%", $kw->{clickShareTop3} * 100) . " 偏高，广告竞争激烈" if $kw->{clickShareTop3} > 0.4;
push @risks, "ABA 周排名(" . int($kw->{abaWeek}) . ") 弱于月排名(" . int($kw->{abaMonth}) . ")，短期热度略降" if $kw->{abaWeek} > $kw->{abaMonth};
push @risks, "类目混杂（卡片/书籍/礼品），需明确细分定位";
my $zero_rev_sales = scalar grep { $_->{reviews} == 0 && $_->{sales} > 0 } @products;
push @risks, "新卖家机会：${zero_rev_sales} 个有销量但 Review=0 的 listing" if $zero_rev_sales;

my %brand_sales;
$brand_sales{ $_->{brand} || "Unknown" } += $_->{sales} for @products;
my @brand_sorted = sort { $brand_sales{$b} <=> $brand_sales{$a} } keys %brand_sales;
my $brand_limit = @brand_sorted > 10 ? 9 : $#brand_sorted;

my $out = {
  keyword      => $keyword,
  keywordMeta  => $kw,
  market       => {
    productCount         => scalar(@products),
    totalSales           => $total_sales + 0,
    totalRevenue         => $total_rev + 0,
    top10SalesPct        => sprintf("%.1f", $top10_pct) + 0,
    top10RevenuePct      => $total_rev ? sprintf("%.1f", 100 * $top10_rev / $total_rev) + 0 : 0,
    medianPrice          => sprintf("%.2f", $med_price) + 0,
    medianReviews        => sprintf("%.0f", $med_reviews) + 0,
    medianReviewsNonZero => sprintf("%.0f", $med_reviews_nz) + 0,
    medianMargin         => sprintf("%.1f", $med_margin * 100) + 0,
    zeroReviewWithSales  => $zero_rev_sales + 0,
    positiveGrowthCount  => 0 + scalar(grep { $_->{salesGrowth} > 0 } @products),
  },
  totalScore         => $total,
  reviewBarrierScore => $s7,
  verdict            => verdict($total),
  dimensions         => [
    { key => "demand", name => "市场需求强度", score => $s1, max => 20, metric => "月搜索量 " . int($kw->{monthlySearch}), detail => "月购买量 " . int($kw->{monthlyPurchase}) . "，购买率 " . sprintf("%.1f%%", $kw->{purchaseRate} * 100) },
    { key => "supply", name => "供需关系", score => $s2, max => 20, metric => "需供比 " . sprintf("%.2f", $kw->{supplyDemandRatio}), detail => "商品数 " . int($kw->{productCount}) },
    { key => "concentration", name => "竞争集中度", score => $s3, max => 20, metric => "Top10 销量占比 " . sprintf("%.1f%%", $top10_pct), detail => "Top10 销额占比 " . sprintf("%.1f%%", $total_rev ? 100 * $top10_rev / $total_rev : 0) },
    { key => "price", name => "价格与利润空间", score => $s4, max => 15, metric => "中位价 \$" . sprintf("%.2f", $med_price), detail => "毛利率中位数 " . sprintf("%.1f%%", $med_margin * 100) },
    { key => "diff", name => "差异化空间", score => $s5, max => 15, metric => "多细分人群/场景", detail => "bulk / saints / bible verse / gift 等" },
    { key => "trend", name => "趋势性", score => $s6, max => 10, metric => "ABA 月→周 " . int($kw->{abaMonth}) . "→" . int($kw->{abaWeek}), detail => ( scalar grep { $_->{salesGrowth} > 0 } @products ) . "/" . scalar(@products) . " listing 销量正增长" },
  ],
  risks      => \@risks,
  top10      => \@top10,
  brandShare => [ map { { brand => $_, sales => $brand_sales{$_} + 0, pct => sprintf("%.1f", 100 * $brand_sales{$_} / ($total_sales || 1)) + 0 } } @brand_sorted[ 0 .. $brand_limit ] ],
  products   => \@products,
};

my $out_path = "$base/keyword-scorer/public/data/default-analysis.json";
open my $out_fh, ">", $out_path or die $!;
print {$out_fh} JSON::PP->new->utf8->pretty->encode($out);
close $out_fh;
print "Written to $out_path\n";
